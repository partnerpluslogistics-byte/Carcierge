from datetime import datetime, timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models
from auth import get_current_admin

router = APIRouter(tags=["Admin Analytics"])


@router.get("/admin/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> Dict[str, Any]:
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    warning_cutoff = now + timedelta(days=30)

    # ─── User Stats ───────────────────────────────────────────────────────────
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.archived_at.is_(None)).count()
    new_this_month = db.query(models.User).filter(models.User.created_at >= first_of_month).count()
    archived_users = db.query(models.User).filter(models.User.archived_at.isnot(None)).count()

    user_stats = {
        "total": total_users,
        "active": active_users,
        "new_this_month": new_this_month,
        "archived": archived_users,
    }

    # ─── Vehicle Stats ────────────────────────────────────────────────────────
    total_vehicles = db.query(models.Vehicle).count()
    cars = db.query(models.Vehicle).filter(models.Vehicle.vehicle_type == "Car").count()
    bikes = db.query(models.Vehicle).filter(models.Vehicle.vehicle_type == "Bike").count()

    country_rows = (
        db.query(models.Vehicle.country, func.count(models.Vehicle.id).label("count"))
        .filter(models.Vehicle.country.isnot(None))
        .group_by(models.Vehicle.country)
        .order_by(func.count(models.Vehicle.id).desc())
        .all()
    )
    by_country = [{"country": row.country, "count": row.count} for row in country_rows]

    vehicle_stats = {
        "total": total_vehicles,
        "by_type": {"cars": cars, "bikes": bikes},
        "by_country": by_country,
    }

    # ─── Registration Stats ───────────────────────────────────────────────────
    all_regs = db.query(models.Registration).all()
    total_regs = len(all_regs)
    expired_regs = sum(1 for r in all_regs if r.expiry_date and r.expiry_date < now)
    expiring_regs = sum(
        1 for r in all_regs
        if r.expiry_date and now <= r.expiry_date <= warning_cutoff
    )
    active_regs = total_regs - expired_regs - expiring_regs

    registration_stats = {
        "total": total_regs,
        "active": max(active_regs, 0),
        "expiring_soon": expiring_regs,
        "expired": expired_regs,
    }

    # ─── Insurance Stats ──────────────────────────────────────────────────────
    all_pols = db.query(models.InsurancePolicy).all()
    total_pols = len(all_pols)
    expired_pols = sum(1 for p in all_pols if p.policy_end_date and p.policy_end_date < now)
    expiring_pols = sum(
        1 for p in all_pols
        if p.policy_end_date and now <= p.policy_end_date <= warning_cutoff
    )
    active_pols = total_pols - expired_pols - expiring_pols

    insurance_stats = {
        "total": total_pols,
        "active": max(active_pols, 0),
        "expiring_soon": expiring_pols,
        "expired": expired_pols,
    }

    # ─── Service Request Stats ────────────────────────────────────────────────
    total_srs = db.query(models.ServiceRequest).count()

    type_rows = (
        db.query(models.ServiceRequest.request_type, func.count(models.ServiceRequest.id).label("count"))
        .group_by(models.ServiceRequest.request_type)
        .all()
    )
    by_type = [{"type": row.request_type, "count": row.count} for row in type_rows]

    status_rows = (
        db.query(models.ServiceRequest.status, func.count(models.ServiceRequest.id).label("count"))
        .group_by(models.ServiceRequest.status)
        .all()
    )
    by_status = [{"status": row.status, "count": row.count} for row in status_rows]

    service_request_stats = {
        "total": total_srs,
        "by_type": by_type,
        "by_status": by_status,
    }

    # ─── Payment Stats ────────────────────────────────────────────────────────
    total_amount_row = db.query(func.sum(models.Payment.amount)).scalar()
    total_amount = float(total_amount_row) if total_amount_row else 0.0

    # Bank transfers as proxy for pending/approved
    pending_bt = db.query(models.BankTransfer).filter(
        models.BankTransfer.approved_by_admin == False,  # noqa: E712
        models.BankTransfer.rejected_at.is_(None),
    ).count()
    approved_bt = db.query(models.BankTransfer).filter(
        models.BankTransfer.approved_by_admin == True  # noqa: E712
    ).count()

    payment_stats = {
        "total_amount": total_amount,
        "pending_count": pending_bt,
        "approved_count": approved_bt,
    }

    return {
        "user_stats": user_stats,
        "vehicle_stats": vehicle_stats,
        "registration_stats": registration_stats,
        "insurance_stats": insurance_stats,
        "service_request_stats": service_request_stats,
        "payment_stats": payment_stats,
    }
