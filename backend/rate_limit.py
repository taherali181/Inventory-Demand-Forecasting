# rate_limit.py
"""Shared slowapi Limiter instance.

Kept in its own module (rather than defined directly in main.py) so routers
can `from rate_limit import limiter` and decorate individual endpoints
without importing the whole app factory — avoids a circular import between
main.py (which imports every router) and the routers themselves.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
