# auth.py
"""Password hashing and JWT issuing/verification.

JWT_SECRET_KEY must be overridden via env var for any real deployment — the
default here is only for local dev. python-jose was skipped in favor of
PyJWT (smaller surface area, actively maintained).

Hashing uses the `bcrypt` library directly rather than passlib's CryptContext:
passlib 1.7.4's bcrypt backend does an internal self-test against a >72-byte
secret to detect a legacy bcrypt wraparound bug, and bcrypt>=4.1 raises
ValueError instead of silently truncating for secrets over 72 bytes — which
made every hash_password() call fail outright. Calling bcrypt directly avoids
that self-test entirely. Passwords are capped at 72 bytes via schemas.py
(bcrypt's own limit) so callers get a clean 422 instead of a 500.
"""
import datetime as dt
import hashlib
import secrets
from typing import Optional

import bcrypt
import jwt

from config import DEFAULT_JWT_SECRET_KEY, settings

SECRET_KEY = settings.jwt_secret_key
ALGORITHM = "HS256"
# Access tokens are now short-lived; a refresh token (see create_refresh_token
# below) is what actually keeps a session alive across the 15-minute window.
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

def check_production_secret_is_safe(environment: str, jwt_secret_key: str) -> None:
    """Raises RuntimeError if running with ENVIRONMENT=production while
    JWT_SECRET_KEY is still the insecure development default. Factored out
    as a plain function (rather than inline at module scope) so it's
    unit-testable without needing to reimport this module under different
    settings — see tests/test_config.py."""
    if environment == "production" and jwt_secret_key == DEFAULT_JWT_SECRET_KEY:
        raise RuntimeError(
            "JWT_SECRET_KEY is still set to the insecure development default while "
            "ENVIRONMENT=production. Set a real secret (e.g. `openssl rand -hex 32`) "
            "via the JWT_SECRET_KEY environment variable before starting the app."
        )


check_production_secret_is_safe(settings.environment, SECRET_KEY)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(subject: str, expires_delta: Optional[dt.timedelta] = None) -> str:
    expire = dt.datetime.now(dt.timezone.utc) + (expires_delta or dt.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def generate_refresh_token() -> str:
    """A high-entropy opaque token (not a JWT). The client stores the raw
    value; the server stores only its hash (models.RefreshToken.token_hash),
    mirroring how passwords are hashed rather than stored in the clear."""
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    # Plain SHA-256, not bcrypt: this is a 256-bit random token, not a
    # low-entropy user-chosen password, so there's no brute-force risk to
    # slow down against — just a fast, deterministic lookup key.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
