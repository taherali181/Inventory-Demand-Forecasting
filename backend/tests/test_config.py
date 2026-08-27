# tests/test_config.py
"""Tests the production-secret startup guard (Phase 7, Change 7.1) directly
against the extracted check function rather than by reimporting auth.py
under different env vars, which would be awkward given Python caches
imported modules."""
import pytest

from auth import check_production_secret_is_safe
from config import DEFAULT_JWT_SECRET_KEY


def test_raises_when_production_and_secret_is_still_the_default():
    with pytest.raises(RuntimeError, match="insecure development default"):
        check_production_secret_is_safe("production", DEFAULT_JWT_SECRET_KEY)


def test_passes_when_production_and_secret_is_overridden():
    check_production_secret_is_safe("production", "a-real-secret-someone-generated")


def test_passes_when_development_even_with_the_default_secret():
    check_production_secret_is_safe("development", DEFAULT_JWT_SECRET_KEY)
