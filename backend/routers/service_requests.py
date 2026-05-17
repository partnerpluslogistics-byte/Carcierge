from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Service Requests"])

VALID_STATUSES = {"Pending", "In Progress", "Completed", "Cancelled"}


@router.post("/service-requests", response_model=schemas.ServiceRequestOut, status_code=status.HTTP_201_CREATED)
def create_service_request(
    payload: schemas.ServiceRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.vehicle_id:
        v = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
        if not v or (current_user.role != "admin" and v.user_id != current_user.id):
            raise HTTPException(status_code=404, detail="Vehicle not found")

    sr = models.ServiceRequest(
        user_id=current_user.id,
        vehicle_id=payload.vehicle_id,
        request_type=payload.request_type,
        notes=payload.notes,
    )
    db.add(sr)
    db.commit()
    db.refresh(sr)
    return sr


@router.get("/service-requests/mine", response_model=List[schemas.ServiceRequestOut])
def get_my_service_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ServiceRequest)
        .filter(models.ServiceRequest.user_id == current_user.id)
        .order_by(models.ServiceRequest.created_at.desc())
        .all()
    )


@router.get("/service-requests/all", response_model=List[schemas.ServiceRequestOut])
def get_all_service_requests(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return (
        db.query(models.ServiceRequest)
        .order_by(models.ServiceRequest.created_at.desc())
        .all()
    )


@router.get("/service-requests/{sr_id}", response_model=schemas.ServiceRequestOut)
def get_service_request(
    sr_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    if current_user.role != "admin" and sr.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return sr


@router.put("/service-requests/{sr_id}", response_model=schemas.ServiceRequestOut)
def update_service_request(
    sr_id: int,
    payload: schemas.ServiceRequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")

    # Non-admins can only edit their own pending requests
    if current_user.role != "admin":
        if sr.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if sr.status not in ("Pending",):
            raise HTTPException(status_code=400, detail="Can only edit pending requests")
        # Non-admins cannot change status or admin_notes
        payload_data = payload.model_dump(exclude_unset=True)
        payload_data.pop("status", None)
        payload_data.pop("admin_notes", None)
    else:
        payload_data = payload.model_dump(exclude_unset=True)

    for field, value in payload_data.items():
        setattr(sr, field, value)

    sr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sr)
    return sr


@router.put("/service-requests/{sr_id}/status", response_model=schemas.ServiceRequestOut)
def update_service_request_status(
    sr_id: int,
    payload: schemas.ServiceRequestUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    for field, value in data.items():
        setattr(sr, field, value)

    sr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sr)
    return sr


@router.post("/service-requests/{sr_id}/cancel", response_model=schemas.ServiceRequestOut)
def cancel_service_request(
    sr_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    if current_user.role != "admin" and sr.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if sr.status == "Completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed request")
    if sr.status == "Cancelled":
        raise HTTPException(status_code=400, detail="Request is already cancelled")

    sr.status = "Cancelled"
    sr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sr)
    return sr
