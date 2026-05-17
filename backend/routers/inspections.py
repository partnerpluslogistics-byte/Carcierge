from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(tags=["Inspections"])


def _check_vehicle_access(vehicle_id: int, current_user: models.User, db: Session) -> models.Vehicle:
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return v


@router.get("/inspections", response_model=List[schemas.InspectionOut])
def list_inspections(
    vehicle_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Inspection)
    if current_user.role != "admin":
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    if vehicle_id:
        q = q.filter(models.Inspection.vehicle_id == vehicle_id)
    return q.order_by(models.Inspection.created_at.desc()).all()


@router.get("/inspections/expiring", response_model=List[schemas.InspectionOut])
def expiring_inspections(
    threshold: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() + timedelta(days=threshold)
    q = (
        db.query(models.Inspection)
        .filter(
            models.Inspection.expiry_date <= cutoff,
            models.Inspection.expiry_date >= datetime.utcnow(),
        )
    )
    if current_user.role != "admin":
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    return q.order_by(models.Inspection.expiry_date.asc()).all()


@router.get("/inspections/{inspection_id}", response_model=schemas.InspectionOut)
def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    insp = db.query(models.Inspection).filter(models.Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    _check_vehicle_access(insp.vehicle_id, current_user, db)
    return insp


class InspectionCreateWithVehicle(schemas.InspectionCreate):
    vehicle_id: int

@router.post("/inspections", response_model=schemas.InspectionOut, status_code=status.HTTP_201_CREATED)
def create_inspection(
    payload: InspectionCreateWithVehicle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_vehicle_access(payload.vehicle_id, current_user, db)
    data = payload.model_dump()
    vehicle_id = data.pop("vehicle_id")
    insp = models.Inspection(vehicle_id=vehicle_id, **data)
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return insp


@router.put("/inspections/{inspection_id}", response_model=schemas.InspectionOut)
def update_inspection(
    inspection_id: int,
    payload: schemas.InspectionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    insp = db.query(models.Inspection).filter(models.Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    _check_vehicle_access(insp.vehicle_id, current_user, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(insp, field, value)

    insp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(insp)
    return insp


@router.delete("/inspections/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    insp = db.query(models.Inspection).filter(models.Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    _check_vehicle_access(insp.vehicle_id, current_user, db)
    db.delete(insp)
    db.commit()
