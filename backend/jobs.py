from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
import models
from database import SessionLocal
import logging

logger = logging.getLogger(__name__)

REMINDER_DAYS = [10, 5, 4, 3, 2, 1]
URGENT_THRESHOLD = 3


def _already_sent(db: Session, user_id: int, vehicle_id: int, record_type: str, record_id: int, days: int) -> bool:
    today_str = date.today().isoformat()
    key = f"{record_type}:{record_id}:day:{days}:date:{today_str}"
    existing = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.vehicle_id == vehicle_id,
        models.Notification.message.contains(key),
    ).first()
    return existing is not None


def send_expiry_reminders():
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        urgent_summaries = []
        warning_summaries = []

        users = db.query(models.User).filter(
            models.User.archived_at == None,
            models.User.role == "user",
        ).all()

        for user in users:
            vehicles = db.query(models.Vehicle).filter(
                models.Vehicle.user_id == user.id
            ).all()

            for vehicle in vehicles:
                vehicle_label = f"{vehicle.make} {vehicle.model} ({vehicle.plate_number})"

                # Check registrations
                for reg in db.query(models.Registration).filter(models.Registration.vehicle_id == vehicle.id).all():
                    if not reg.expiry_date:
                        continue
                    days_left = (reg.expiry_date - now).days
                    if days_left in REMINDER_DAYS:
                        if not _already_sent(db, user.id, vehicle.id, "registration", reg.id, days_left):
                            prefix = "⚠️ URGENT: " if days_left <= URGENT_THRESHOLD else ""
                            msg = (
                                f"{prefix}Vehicle Registration for {vehicle_label} expires on "
                                f"{reg.expiry_date.strftime('%Y-%m-%d')} ({days_left} days remaining). "
                                f"Submit a renewal at /service-requests. "
                                f"[registration:{reg.id}:day:{days_left}:date:{date.today().isoformat()}]"
                            )
                            notif = models.Notification(
                                user_id=user.id,
                                vehicle_id=vehicle.id,
                                title=f"{prefix}Registration Expiring Soon",
                                message=msg,
                                type="expiry_critical" if days_left <= URGENT_THRESHOLD else "expiry_warning",
                            )
                            db.add(notif)
                            if days_left <= URGENT_THRESHOLD:
                                urgent_summaries.append(f"{user.name}: {vehicle_label} registration expires in {days_left}d")
                            else:
                                warning_summaries.append(f"{user.name}: {vehicle_label} registration expires in {days_left}d")

                # Check insurance policies
                for policy in db.query(models.InsurancePolicy).filter(models.InsurancePolicy.vehicle_id == vehicle.id).all():
                    if not policy.policy_end_date:
                        continue
                    days_left = (policy.policy_end_date - now).days
                    if days_left in REMINDER_DAYS:
                        if not _already_sent(db, user.id, vehicle.id, "insurance", policy.id, days_left):
                            prefix = "⚠️ URGENT: " if days_left <= URGENT_THRESHOLD else ""
                            msg = (
                                f"{prefix}Insurance Policy ({policy.policy_number or 'N/A'}) for {vehicle_label} expires on "
                                f"{policy.policy_end_date.strftime('%Y-%m-%d')} ({days_left} days remaining). "
                                f"Submit a renewal at /service-requests. "
                                f"[insurance:{policy.id}:day:{days_left}:date:{date.today().isoformat()}]"
                            )
                            notif = models.Notification(
                                user_id=user.id,
                                vehicle_id=vehicle.id,
                                title=f"{prefix}Insurance Policy Expiring Soon",
                                message=msg,
                                type="expiry_critical" if days_left <= URGENT_THRESHOLD else "expiry_warning",
                            )
                            db.add(notif)
                            if days_left <= URGENT_THRESHOLD:
                                urgent_summaries.append(f"{user.name}: {vehicle_label} insurance expires in {days_left}d")
                            else:
                                warning_summaries.append(f"{user.name}: {vehicle_label} insurance expires in {days_left}d")

                # Check inspections
                for insp in db.query(models.Inspection).filter(models.Inspection.vehicle_id == vehicle.id).all():
                    if not insp.expiry_date:
                        continue
                    days_left = (insp.expiry_date - now).days
                    if days_left in REMINDER_DAYS:
                        if not _already_sent(db, user.id, vehicle.id, "inspection", insp.id, days_left):
                            prefix = "⚠️ URGENT: " if days_left <= URGENT_THRESHOLD else ""
                            msg = (
                                f"{prefix}Vehicle Inspection for {vehicle_label} expires on "
                                f"{insp.expiry_date.strftime('%Y-%m-%d')} ({days_left} days remaining). "
                                f"Submit a renewal at /service-requests. "
                                f"[inspection:{insp.id}:day:{days_left}:date:{date.today().isoformat()}]"
                            )
                            notif = models.Notification(
                                user_id=user.id,
                                vehicle_id=vehicle.id,
                                title=f"{prefix}Inspection Expiring Soon",
                                message=msg,
                                type="expiry_critical" if days_left <= URGENT_THRESHOLD else "expiry_warning",
                            )
                            db.add(notif)
                            if days_left <= URGENT_THRESHOLD:
                                urgent_summaries.append(f"{user.name}: {vehicle_label} inspection expires in {days_left}d")
                            else:
                                warning_summaries.append(f"{user.name}: {vehicle_label} inspection expires in {days_left}d")

        db.commit()

        # Send admin summary notification
        if urgent_summaries or warning_summaries:
            admins = db.query(models.User).filter(models.User.role == "admin").all()
            summary_lines = []
            if urgent_summaries:
                summary_lines.append("🔴 URGENT (≤3 days):")
                summary_lines.extend(f"  • {s}" for s in urgent_summaries)
            if warning_summaries:
                summary_lines.append("🟡 Warnings (>3 days):")
                summary_lines.extend(f"  • {s}" for s in warning_summaries)

            for admin in admins:
                admin_notif = models.Notification(
                    user_id=admin.id,
                    title="Daily Expiry Summary",
                    message="\n".join(summary_lines),
                    type="system",
                )
                db.add(admin_notif)
            db.commit()

        logger.info(f"Expiry reminders sent: {len(urgent_summaries)} urgent, {len(warning_summaries)} warnings")

    except Exception as e:
        logger.error(f"Error in expiry reminder job: {e}")
        db.rollback()
    finally:
        db.close()
