from datetime import datetime
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Subscriptions"])


@router.post("/subscriptions", response_model=schemas.SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: schemas.SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Check if user already has an active or pending subscription
    existing = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status.in_(["pending_payment", "pending_approval", "active"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have an active or pending subscription",
        )

    sub = models.Subscription(
        user_id=current_user.id,
        amount=payload.amount if payload.amount is not None else Decimal("50.00"),
        currency=payload.currency or "USD",
        status="pending_payment",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/subscriptions/mine", response_model=List[schemas.SubscriptionOut])
def get_my_subscriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .order_by(models.Subscription.created_at.desc())
        .all()
    )


@router.get("/subscriptions/active", response_model=schemas.SubscriptionOut)
def get_active_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.user_id == current_user.id,
            models.Subscription.status == "active",
        )
        .order_by(models.Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found")
    return sub


@router.get("/subscriptions/all", response_model=List[schemas.SubscriptionOut])
def get_all_subscriptions(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return (
        db.query(models.Subscription)
        .order_by(models.Subscription.created_at.desc())
        .all()
    )


@router.get("/subscriptions/{sub_id}", response_model=schemas.SubscriptionOut)
def get_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = db.query(models.Subscription).filter(models.Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if current_user.role != "admin" and sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return sub
