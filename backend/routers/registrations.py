from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Registrations"])


def _check_vehicle_access(vehicle_id: int, current_user: models.User, db: Session) -> models.Vehicle:
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return v


@router.get("/registrations", response_model=List[schemas.RegistrationOut])
def list_registrations(
    vehicle_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Registration)
    if current_user.role != "admin":
        # Only registrations for user's own vehicles
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    if vehicle_id:
        q = q.filter(models.Registration.vehicle_id == vehicle_id)
    return q.order_by(models.Registration.created_at.desc()).all()


@router.get("/registrations/expiring", response_model=List[schemas.RegistrationOut])
def expiring_registrations(
    threshold: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() + timedelta(days=threshold)
    q = (
        db.query(models.Registration)
        .filter(
            models.Registration.expiry_date <= cutoff,
            models.Registration.expiry_date >= datetime.utcnow(),
        )
    )
    if current_user.role != "admin":
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    return q.order_by(models.Registration.expiry_date.asc()).all()


@router.get("/registrations/{registration_id}", response_model=schemas.RegistrationOut)
def get_registration(
    registration_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reg = db.query(models.Registration).filter(models.Registration.id == registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    _check_vehicle_access(reg.vehicle_id, current_user, db)
    return reg


class RegistrationCreateWithVehicle(schemas.RegistrationCreate):
    vehicle_id: int

@router.post("/registrations", response_model=schemas.RegistrationOut, status_code=status.HTTP_201_CREATED)
def create_registration(
    payload: RegistrationCreateWithVehicle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_vehicle_access(payload.vehicle_id, current_user, db)
    data = payload.model_dump()
    vehicle_id = data.pop("vehicle_id")
    reg = models.Registration(vehicle_id=vehicle_id, **data)
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


@router.put("/registrations/{registration_id}", response_model=schemas.RegistrationOut)
def update_registration(
    registration_id: int,
    payload: schemas.RegistrationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reg = db.query(models.Registration).filter(models.Registration.id == registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    _check_vehicle_access(reg.vehicle_id, current_user, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reg, field, value)

    reg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(reg)
    return reg


@router.delete("/registrations/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_registration(
    registration_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reg = db.query(models.Registration).filter(models.Registration.id == registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    _check_vehicle_access(reg.vehicle_id, current_user, db)
    db.delete(reg)
    db.commit()
