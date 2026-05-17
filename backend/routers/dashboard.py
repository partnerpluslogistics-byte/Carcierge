from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(tags=["Dashboard"])


def _vehicle_query(db: Session, current_user: models.User):
    """Base query scoped to current user (or all if admin)."""
    q = db.query(models.Vehicle)
    if current_user.role != "admin":
        q = q.filter(models.Vehicle.user_id == current_user.id)
    return q


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.utcnow()
    warning_cutoff = now + timedelta(days=30)

    # Vehicle IDs accessible to this user
    vehicles = _vehicle_query(db, current_user).all()
    vehicle_ids = [v.id for v in vehicles]

    # Vehicle breakdown
    cars = sum(1 for v in vehicles if v.vehicle_type == "Car")
    bikes = sum(1 for v in vehicles if v.vehicle_type == "Bike")

    def reg_stats():
        if not vehicle_ids:
            return 0, 0, 0, 0
        all_regs = db.query(models.Registration).filter(
            models.Registration.vehicle_id.in_(vehicle_ids)
        ).all()
        total = len(all_regs)
        expired = sum(1 for r in all_regs if r.expiry_date and r.expiry_date < now)
        expiring = sum(
            1 for r in all_regs
            if r.expiry_date and now <= r.expiry_date <= warning_cutoff
        )
        active = total - expired - expiring
        return total, max(active, 0), expiring, expired

    def policy_stats():
        if not vehicle_ids:
            return 0, 0, 0, 0
        all_pol = db.query(models.InsurancePolicy).filter(
            models.InsurancePolicy.vehicle_id.in_(vehicle_ids)
        ).all()
        total = len(all_pol)
        expired = sum(1 for p in all_pol if p.policy_end_date and p.policy_end_date < now)
        expiring = sum(
            1 for p in all_pol
            if p.policy_end_date and now <= p.policy_end_date <= warning_cutoff
        )
        active = total - expired - expiring
        return total, max(active, 0), expiring, expired

    def insp_stats():
        if not vehicle_ids:
            return 0, 0, 0, 0
        all_insp = db.query(models.Inspection).filter(
            models.Inspection.vehicle_id.in_(vehicle_ids)
        ).all()
        total = len(all_insp)
        expired = sum(1 for i in all_insp if i.expiry_date and i.expiry_date < now)
        expiring = sum(
            1 for i in all_insp
            if i.expiry_date and now <= i.expiry_date <= warning_cutoff
        )
        active = total - expired - expiring
        return total, max(active, 0), expiring, expired

    total_reg, active_reg, expiring_reg, expired_reg = reg_stats()
    total_pol, active_pol, expiring_pol, expired_pol = policy_stats()
    total_insp, active_insp, expiring_insp, expired_insp = insp_stats()

    return schemas.DashboardSummary(
        total_vehicles=len(vehicles),
        vehicle_breakdown=schemas.VehicleBreakdown(cars=cars, bikes=bikes),
        total_registrations=total_reg,
        active_registrations=active_reg,
        expiring_registrations=expiring_reg,
        expired_registrations=expired_reg,
        total_policies=total_pol,
        active_policies=active_pol,
        expiring_policies=expiring_pol,
        expired_policies=expired_pol,
        total_inspections=total_insp,
        active_inspections=active_insp,
        expiring_inspections=expiring_insp,
        expired_inspections=expired_insp,
    )


@router.get("/dashboard/expiry-alerts", response_model=List[schemas.ExpiryAlert])
def expiry_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.utcnow()
    warning_cutoff = now + timedelta(days=30)

    vehicles = _vehicle_query(db, current_user).all()
    vehicle_map = {v.id: v.plate_number for v in vehicles}
    vehicle_ids = list(vehicle_map.keys())

    alerts: List[schemas.ExpiryAlert] = []

    if not vehicle_ids:
        return alerts

    # Registrations
    regs = db.query(models.Registration).filter(
        models.Registration.vehicle_id.in_(vehicle_ids),
        models.Registration.expiry_date.isnot(None),
        models.Registration.expiry_date <= warning_cutoff,
        models.Registration.expiry_date >= now,
    ).all()
    for r in regs:
        days = (r.expiry_date - now).days
        alerts.append(schemas.ExpiryAlert(
            vehicle_id=r.vehicle_id,
            plate_number=vehicle_map[r.vehicle_id],
            type="registration",
            days_remaining=days,
            expiry_date=r.expiry_date,
            severity="critical" if days <= 7 else "warning",
        ))

    # Insurance
    policies = db.query(models.InsurancePolicy).filter(
        models.InsurancePolicy.vehicle_id.in_(vehicle_ids),
        models.InsurancePolicy.policy_end_date.isnot(None),
        models.InsurancePolicy.policy_end_date <= warning_cutoff,
        models.InsurancePolicy.policy_end_date >= now,
    ).all()
    for p in policies:
        days = (p.policy_end_date - now).days
        alerts.append(schemas.ExpiryAlert(
            vehicle_id=p.vehicle_id,
            plate_number=vehicle_map[p.vehicle_id],
            type="insurance",
            days_remaining=days,
            expiry_date=p.policy_end_date,
            severity="critical" if days <= 7 else "warning",
        ))

    # Inspections
    insps = db.query(models.Inspection).filter(
        models.Inspection.vehicle_id.in_(vehicle_ids),
        models.Inspection.expiry_date.isnot(None),
        models.Inspection.expiry_date <= warning_cutoff,
        models.Inspection.expiry_date >= now,
    ).all()
    for i in insps:
        days = (i.expiry_date - now).days
        alerts.append(schemas.ExpiryAlert(
            vehicle_id=i.vehicle_id,
            plate_number=vehicle_map[i.vehicle_id],
            type="inspection",
            days_remaining=days,
            expiry_date=i.expiry_date,
            severity="critical" if days <= 7 else "warning",
        ))

    alerts.sort(key=lambda a: a.days_remaining)
    return alerts


@router.get("/dashboard/calendar-events", response_model=List[schemas.CalendarEvent])
def calendar_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.utcnow()
    end = now + timedelta(days=90)

    vehicles = _vehicle_query(db, current_user).all()
    vehicle_map = {v.id: v.plate_number for v in vehicles}
    vehicle_ids = list(vehicle_map.keys())

    events: List[schemas.CalendarEvent] = []

    if not vehicle_ids:
        return events

    # Registrations
    regs = db.query(models.Registration).filter(
        models.Registration.vehicle_id.in_(vehicle_ids),
        models.Registration.expiry_date.isnot(None),
        models.Registration.expiry_date >= now,
        models.Registration.expiry_date <= end,
    ).all()
    for r in regs:
        days = (r.expiry_date - now).days
        events.append(schemas.CalendarEvent(
            date=r.expiry_date,
            type="registration",
            label="Registration Expiry",
            plate_number=vehicle_map[r.vehicle_id],
            severity="critical" if days <= 7 else "warning",
            vehicle_id=r.vehicle_id,
        ))

    # Insurance
    policies = db.query(models.InsurancePolicy).filter(
        models.InsurancePolicy.vehicle_id.in_(vehicle_ids),
        models.InsurancePolicy.policy_end_date.isnot(None),
        models.InsurancePolicy.policy_end_date >= now,
        models.InsurancePolicy.policy_end_date <= end,
    ).all()
    for p in policies:
        days = (p.policy_end_date - now).days
        events.append(schemas.CalendarEvent(
            date=p.policy_end_date,
            type="insurance",
            label="Insurance Expiry",
            plate_number=vehicle_map[p.vehicle_id],
            severity="critical" if days <= 7 else "warning",
            vehicle_id=p.vehicle_id,
        ))

    # Inspections
    insps = db.query(models.Inspection).filter(
        models.Inspection.vehicle_id.in_(vehicle_ids),
        models.Inspection.expiry_date.isnot(None),
        models.Inspection.expiry_date >= now,
        models.Inspection.expiry_date <= end,
    ).all()
    for i in insps:
        days = (i.expiry_date - now).days
        events.append(schemas.CalendarEvent(
            date=i.expiry_date,
            type="inspection",
            label="Inspection Expiry",
            plate_number=vehicle_map[i.vehicle_id],
            severity="critical" if days <= 7 else "warning",
            vehicle_id=i.vehicle_id,
        ))

    events.sort(key=lambda e: e.date)
    return events
