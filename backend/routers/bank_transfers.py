from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Bank Transfers"])


def _get_transfer_or_404(transfer_id: int, db: Session) -> models.BankTransfer:
    bt = db.query(models.BankTransfer).filter(models.BankTransfer.id == transfer_id).first()
    if not bt:
        raise HTTPException(status_code=404, detail="Bank transfer not found")
    return bt


@router.post("/bank-transfers", response_model=schemas.BankTransferOut, status_code=status.HTTP_201_CREATED)
def create_bank_transfer(
    payload: schemas.BankTransferCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.vehicle_id:
        v = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
        if not v or (current_user.role != "admin" and v.user_id != current_user.id):
            raise HTTPException(status_code=404, detail="Vehicle not found")

    if payload.subscription_id:
        sub = db.query(models.Subscription).filter(models.Subscription.id == payload.subscription_id).first()
        if not sub or (current_user.role != "admin" and sub.user_id != current_user.id):
            raise HTTPException(status_code=404, detail="Subscription not found")

    if payload.service_request_id:
        sr = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == payload.service_request_id).first()
        if not sr or (current_user.role != "admin" and sr.user_id != current_user.id):
            raise HTTPException(status_code=404, detail="Service request not found")

    bt = models.BankTransfer(
        user_id=current_user.id,
        vehicle_id=payload.vehicle_id,
        subscription_id=payload.subscription_id,
        service_request_id=payload.service_request_id,
        payment_type=payload.payment_type,
        payment_method=payload.payment_method or "bank_transfer",
        amount=payload.amount,
        currency=payload.currency or "USD",
        reference_number=payload.reference_number,
        transfer_note=payload.transfer_note,
    )
    db.add(bt)
    db.commit()
    db.refresh(bt)
    return bt


@router.post("/bank-transfers/{transfer_id}/confirm", response_model=schemas.BankTransferOut)
def confirm_bank_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bt = _get_transfer_or_404(transfer_id, db)
    if bt.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if bt.confirmed_by_user:
        raise HTTPException(status_code=400, detail="Transfer already confirmed")

    bt.confirmed_by_user = True
    bt.confirmed_at = datetime.utcnow()
    bt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bt)
    return bt


@router.post("/bank-transfers/{transfer_id}/approve", response_model=schemas.BankTransferOut)
def approve_bank_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    bt = _get_transfer_or_404(transfer_id, db)
    if bt.approved_by_admin:
        raise HTTPException(status_code=400, detail="Transfer already approved")
    if bt.rejected_at:
        raise HTTPException(status_code=400, detail="Transfer has already been rejected")

    bt.approved_by_admin = True
    bt.approved_at = datetime.utcnow()
    bt.approved_by = current_user.id
    bt.updated_at = datetime.utcnow()

    # If linked to a subscription, activate it
    if bt.subscription_id:
        sub = db.query(models.Subscription).filter(models.Subscription.id == bt.subscription_id).first()
        if sub:
            from datetime import timedelta
            sub.status = "active"
            sub.paid_at = datetime.utcnow()
            sub.approved_at = datetime.utcnow()
            sub.approved_by = current_user.id
            sub.start_date = datetime.utcnow()
            sub.expires_at = datetime.utcnow() + timedelta(days=365)
            sub.updated_at = datetime.utcnow()

    # If linked to a vehicle, activate it
    if bt.vehicle_id and bt.payment_type == "subscription":
        v = db.query(models.Vehicle).filter(models.Vehicle.id == bt.vehicle_id).first()
        if v and v.payment_status == "pending_approval":
            v.payment_status = "active"
            v.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(bt)
    return bt


@router.post("/bank-transfers/{transfer_id}/reject", response_model=schemas.BankTransferOut)
def reject_bank_transfer(
    transfer_id: int,
    payload: schemas.BankTransferUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    bt = _get_transfer_or_404(transfer_id, db)
    if bt.rejected_at:
        raise HTTPException(status_code=400, detail="Transfer already rejected")
    if bt.approved_by_admin:
        raise HTTPException(status_code=400, detail="Transfer has already been approved")

    bt.rejected_at = datetime.utcnow()
    bt.rejection_reason = payload.rejection_reason
    bt.admin_notes = payload.admin_notes
    bt.updated_at = datetime.utcnow()

    # Reject linked subscription if present
    if bt.subscription_id:
        sub = db.query(models.Subscription).filter(models.Subscription.id == bt.subscription_id).first()
        if sub and sub.status in ("pending_payment", "pending_approval"):
            sub.status = "rejected"
            sub.rejected_at = datetime.utcnow()
            sub.rejection_reason = payload.rejection_reason
            sub.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(bt)
    return bt


@router.get("/bank-transfers/pending", response_model=List[schemas.BankTransferOut])
def get_pending_transfers(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return (
        db.query(models.BankTransfer)
        .filter(
            models.BankTransfer.approved_by_admin == False,  # noqa: E712
            models.BankTransfer.rejected_at.is_(None),
            models.BankTransfer.archived_at.is_(None),
        )
        .order_by(models.BankTransfer.created_at.asc())
        .all()
    )


@router.get("/bank-transfers/all", response_model=List[schemas.BankTransferOut])
def get_all_transfers(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return (
        db.query(models.BankTransfer)
        .filter(models.BankTransfer.archived_at.is_(None))
        .order_by(models.BankTransfer.created_at.desc())
        .all()
    )


@router.get("/bank-transfers/mine", response_model=List[schemas.BankTransferOut])
def get_my_transfers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.BankTransfer)
        .filter(
            models.BankTransfer.user_id == current_user.id,
            models.BankTransfer.archived_at.is_(None),
        )
        .order_by(models.BankTransfer.created_at.desc())
        .all()
    )


@router.get("/bank-transfers/{transfer_id}", response_model=schemas.BankTransferOut)
def get_bank_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bt = _get_transfer_or_404(transfer_id, db)
    if current_user.role != "admin" and bt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return bt


@router.post("/bank-transfers/{transfer_id}/archive", response_model=schemas.BankTransferOut)
def archive_bank_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bt = _get_transfer_or_404(transfer_id, db)
    if current_user.role != "admin" and bt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if bt.archived_at:
        raise HTTPException(status_code=400, detail="Transfer already archived")

    bt.archived_at = datetime.utcnow()
    bt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bt)
    return bt


@router.post("/bank-transfers/{transfer_id}/unarchive", response_model=schemas.BankTransferOut)
def unarchive_bank_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    bt = _get_transfer_or_404(transfer_id, db)
    if not bt.archived_at:
        raise HTTPException(status_code=400, detail="Transfer is not archived")

    bt.archived_at = None
    bt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bt)
    return bt
