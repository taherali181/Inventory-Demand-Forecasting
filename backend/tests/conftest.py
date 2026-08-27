# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from rate_limit import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """slowapi's default storage is in-memory and keyed by client address —
    since every test in this suite runs through the same TestClient/process,
    without this the whole test session would share one rolling rate-limit
    window and later tests hitting /auth/login or /auth/register would
    start getting 429s once earlier tests exhausted the limit."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture()
def db_session(tmp_path):
    """Point the app at an isolated, throwaway SQLite DB for the duration of
    one test, overriding the get_db dependency. Yields a session factory —
    call it to get a session for direct DB assertions/setup in the test."""
    engine = create_engine(f"sqlite:///{tmp_path}/test.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield testing_session_local
    app.dependency_overrides.clear()


def promote_to_admin(session_factory, email: str) -> None:
    """Flip an already-registered user's role to admin directly via the DB
    (there's no promote-to-admin API endpoint — that's Phase 11's admin
    panel). Since get_current_user/require_admin re-read the user's role
    from the DB on every request rather than trusting a claim baked into
    the JWT, this takes effect on the very next authenticated request with
    that user's existing token — no new login needed."""
    from models import User, UserRole

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == email).first()
        user.role = UserRole.admin
        db.commit()
    finally:
        db.close()
