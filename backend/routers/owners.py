from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Owners"])


# ─── User Owner Endpoints ─────────────────────────────────────────────────────

@router.get("/owners", response_model=List[schemas.OwnerOut])
def list_owners(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Owner)
        .filter(models.Owner.user_id == current_user.id)
        .order_by(models.Owner.created_at.desc())
        .all()
    )


@router.get("/owners/search", response_model=List[schemas.OwnerOut])
def search_owners(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    term = f"%{q}%"
    return (
        db.query(models.Owner)
        .filter(
            models.Owner.user_id == current_user.id,
            (
                models.Owner.full_name.ilike(term)
                | models.Owner.email.ilike(term)
                | models.Owner.contact_number.ilike(term)
                | models.Owner.driver_license_no.ilike(term)
            ),
        )
        .all()
    )


@router.get("/owners/{owner_id}", response_model=schemas.OwnerOut)
def get_owner(
    owner_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owner = (
        db.query(models.Owner)
        .filter(models.Owner.id == owner_id, models.Owner.user_id == current_user.id)
        .first()
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner


@router.post("/owners", response_model=schemas.OwnerOut, status_code=status.HTTP_201_CREATED)
def create_owner(
    payload: schemas.OwnerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owner = models.Owner(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


@router.put("/owners/{owner_id}", response_model=schemas.OwnerOut)
def update_owner(
    owner_id: int,
    payload: schemas.OwnerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owner = (
        db.query(models.Owner)
        .filter(models.Owner.id == owner_id, models.Owner.user_id == current_user.id)
        .first()
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(owner, field, value)

    owner.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(owner)
    return owner


@router.delete("/owners/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_owner(
    owner_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owner = (
        db.query(models.Owner)
        .filter(models.Owner.id == owner_id, models.Owner.user_id == current_user.id)
        .first()
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    db.delete(owner)
    db.commit()


# ─── Admin Owner Endpoints ────────────────────────────────────────────────────

@router.get("/admin/owners", response_model=List[schemas.OwnerOut])
def admin_list_owners(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    q = db.query(models.Owner)
    if user_id is not None:
        q = q.filter(models.Owner.user_id == user_id)
    return q.order_by(models.Owner.created_at.desc()).all()
