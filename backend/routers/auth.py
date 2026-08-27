# routers/auth.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth import create_access_token, decode_access_token, hash_password, verify_password
from database import get_db
from models import User
from schemas import LoginRequest, Token, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

# tokenUrl points at our JSON /auth/login rather than form-encoded OAuth2 login
# (we're not implementing the full OAuth2 password flow, just reusing its
# Authorization: Bearer header parsing). auto_error=False so callers can also
# get an "optional user" dependency for endpoints that work with or without auth.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
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
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive.")

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Require + resolve the calling user. Not yet enforced on any endpoint —
    upload/forecast/eda all stay open; write-gating starts in Phase 3 once
    there are inventory records worth protecting."""
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


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
