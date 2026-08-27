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
from typing import Optional

import bcrypt
import jwt

from config import settings

SECRET_KEY = settings.jwt_secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


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
