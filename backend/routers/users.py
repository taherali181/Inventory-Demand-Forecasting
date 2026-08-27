# routers/users.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from routers.auth import require_admin
from schemas import PaginatedResponse, UserRead, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=PaginatedResponse[UserRead])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    total = db.query(User).count()
    items = db.query(User).order_by(User.email).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total)


@router.patch("/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't change your own role — ask another admin to.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserRead)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """A soft-delete (is_active=False), matching how every other entity in
    this app is deactivated rather than hard-deleted (see products/
    warehouses/suppliers). Takes effect essentially immediately, not just
    on the user's next login: both get_current_user and POST /auth/refresh
    re-fetch the user from the DB and check is_active on every call, so a
    deactivated user's current access token stops working on its very next
    use (well within its 15-minute lifetime — see
    auth.ACCESS_TOKEN_EXPIRE_MINUTES) and their refresh token can no longer
    mint a new one either."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="You can't deactivate your own account — ask another admin to."
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
