# routers/auth.py
import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from database import get_db
from models import RefreshToken, User, UserRole
from rate_limit import limiter
from schemas import (
    AccessTokenOnly,
    LoginRequest,
    RefreshRequest,
    Token,
    UserCreate,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _as_utc(value: dt.datetime) -> dt.datetime:
    """SQLite (used in dev/tests) doesn't actually preserve tzinfo through a
    DateTime(timezone=True) column — a value written as UTC-aware comes back
    from a query as naive, which raises TypeError when compared against a
    fresh tz-aware datetime.now(). We always write these columns as UTC, so
    a naive read-back is safe to reinterpret as UTC. (A real Postgres
    deployment round-trips tzinfo correctly, so this is a no-op there.)"""
    return value if value.tzinfo is not None else value.replace(tzinfo=dt.timezone.utc)

# tokenUrl points at our JSON /auth/login rather than form-encoded OAuth2 login
# (we're not implementing the full OAuth2 password flow, just reusing its
# Authorization: Bearer header parsing). auto_error=False so callers can also
# get an "optional user" dependency for endpoints that work with or without auth.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _issue_tokens(db: Session, user: User) -> Token:
    """Issue a fresh access + refresh token pair, persisting the refresh
    token's hash. Called from both /login and /refresh."""
    access_token = create_access_token(subject=str(user.id))

    raw_refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh_token),
            expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()

    return Token(access_token=access_token, refresh_token=raw_refresh_token)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive.")

    return _issue_tokens(db, user)


@router.post("/refresh", response_model=AccessTokenOnly)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a still-valid refresh token for a new access token. The
    refresh token itself is NOT rotated here — it stays valid until it
    expires (REFRESH_TOKEN_EXPIRE_DAYS) or /auth/logout revokes it."""
    token_hash = hash_refresh_token(payload.refresh_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if (
        stored is None
        or stored.revoked_at is not None
        or _as_utc(stored.expires_at) < dt.datetime.now(dt.timezone.utc)
    ):
        raise HTTPException(status_code=401, detail="Refresh token is invalid, expired, or revoked.")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Refresh token is invalid, expired, or revoked.")

    access_token = create_access_token(subject=str(user.id))
    return AccessTokenOnly(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Revoke a refresh token so it can no longer be exchanged for access
    tokens. Idempotent: revoking an already-revoked/unknown token still 204s,
    since the end state (this token doesn't work) is the same either way."""
    token_hash = hash_refresh_token(payload.refresh_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = dt.datetime.now(dt.timezone.utc)
        db.commit()


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Require + resolve the calling user from a (short-lived) access token."""
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Optional[User]:
    """Like get_current_user, but returns None instead of raising when there's
    no (or an invalid) token — for endpoints that work either way but want to
    attribute the action to a user when one is logged in (e.g. /upload)."""
    if token is None:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    user = db.get(User, int(user_id))
    return user if user and user.is_active else None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Like get_current_user, but additionally requires the admin role.

    Deliberately used only on genuinely administrative writes — creating,
    editing, or deactivating master data (products/warehouses/suppliers) and
    cancelling purchase orders. Day-to-day operational writes (adjusting
    stock, receiving POs, running forecasts) stay on plain get_current_user
    so regular staff accounts aren't blocked from routine work — see the
    call sites in routers/{products,warehouses,suppliers,purchase_orders}.py
    for exactly where this line is drawn.
    """
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="This action requires an admin account.")
    return current_user


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
