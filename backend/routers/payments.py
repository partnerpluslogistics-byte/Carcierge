from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Payments"])


@router.post("/payments", response_model=schemas.PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.vehicle_id:
        v = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
        if not v or (current_user.role != "admin" and v.user_id != current_user.id):
            raise HTTPException(status_code=404, detail="Vehicle not found")

    if payload.service_request_id:
        sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == payload.service_request_id).first()
        if not sr or (current_user.role != "admin" and sr.user_id != current_user.id):
            raise HTTPException(status_code=404, detail="Service request not found")

    payment = models.Payment(
        user_id=current_user.id,
        service_request_id=payload.service_request_id,
        vehicle_id=payload.vehicle_id,
        amount=payload.amount,
        currency=payload.currency or "USD",
        receipt_number=payload.receipt_number,
        payment_date=payload.payment_date or datetime.utcnow(),
        notes=payload.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments/mine", response_model=List[schemas.PaymentOut])
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Payment)
        .filter(models.Payment.user_id == current_user.id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )


@router.get("/payments/all", response_model=List[schemas.PaymentOut])
def get_all_payments(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return (
        db.query(models.Payment)
        .order_by(models.Payment.created_at.desc())
        .all()
    )


@router.get("/payments/vehicle/{vehicle_id}", response_model=List[schemas.PaymentOut])
def get_payments_by_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return (
        db.query(models.Payment)
        .filter(models.Payment.vehicle_id == vehicle_id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )


@router.get("/payments/service-request/{sr_id}", response_model=List[schemas.PaymentOut])
def get_payments_by_service_request(
    sr_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == sr_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    if current_user.role != "admin" and sr.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return (
        db.query(models.Payment)
        .filter(models.Payment.service_request_id == sr_id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )


@router.get("/payments/{payment_id}", response_model=schemas.PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if current_user.role != "admin" and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return payment
