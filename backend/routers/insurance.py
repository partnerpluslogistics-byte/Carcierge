from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(tags=["Insurance"])


def _check_vehicle_access(vehicle_id: int, current_user: models.User, db: Session) -> models.Vehicle:
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return v


@router.get("/insurance", response_model=List[schemas.InsurancePolicyOut])
def list_insurance_policies(
    vehicle_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.InsurancePolicy)
    if current_user.role != "admin":
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    if vehicle_id:
        q = q.filter(models.InsurancePolicy.vehicle_id == vehicle_id)
    return q.order_by(models.InsurancePolicy.created_at.desc()).all()


@router.get("/insurance/expiring", response_model=List[schemas.InsurancePolicyOut])
def expiring_insurance_policies(
    threshold: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() + timedelta(days=threshold)
    q = (
        db.query(models.InsurancePolicy)
        .filter(
            models.InsurancePolicy.policy_end_date <= cutoff,
            models.InsurancePolicy.policy_end_date >= datetime.utcnow(),
        )
    )
    if current_user.role != "admin":
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    return q.order_by(models.InsurancePolicy.policy_end_date.asc()).all()


@router.get("/insurance/{policy_id}", response_model=schemas.InsurancePolicyOut)
def get_insurance_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    policy = db.query(models.InsurancePolicy).filter(models.InsurancePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    _check_vehicle_access(policy.vehicle_id, current_user, db)
    return policy


class InsurancePolicyCreateWithVehicle(schemas.InsurancePolicyCreate):
    vehicle_id: int

@router.post("/insurance", response_model=schemas.InsurancePolicyOut, status_code=status.HTTP_201_CREATED)
def create_insurance_policy(
    payload: InsurancePolicyCreateWithVehicle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_vehicle_access(payload.vehicle_id, current_user, db)
    data = payload.model_dump()
    vehicle_id = data.pop("vehicle_id")
    policy = models.InsurancePolicy(vehicle_id=vehicle_id, **data)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/insurance/{policy_id}", response_model=schemas.InsurancePolicyOut)
def update_insurance_policy(
    policy_id: int,
    payload: schemas.InsurancePolicyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    policy = db.query(models.InsurancePolicy).filter(models.InsurancePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    _check_vehicle_access(policy.vehicle_id, current_user, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)

    policy.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/insurance/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_insurance_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    policy = db.query(models.InsurancePolicy).filter(models.InsurancePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    _check_vehicle_access(policy.vehicle_id, current_user, db)
    db.delete(policy)
    db.commit()
