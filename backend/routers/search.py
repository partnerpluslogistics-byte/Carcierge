from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("")
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    term = f"%{q}%"

    # Base vehicle query
    vehicle_q = db.query(models.Vehicle)
    if current_user.role != "admin":
        vehicle_q = vehicle_q.filter(models.Vehicle.user_id == current_user.id)

    vehicles = vehicle_q.filter(
        (models.Vehicle.plate_number.ilike(term))
        | (models.Vehicle.make.ilike(term))
        | (models.Vehicle.model.ilike(term))
        | (models.Vehicle.vehicle_code.ilike(term))
        | (models.Vehicle.vin.ilike(term))
    ).limit(20).all()

    # Owner query
    owner_q = db.query(models.Owner)
    if current_user.role != "admin":
        owner_q = owner_q.filter(models.Owner.user_id == current_user.id)

    owners = owner_q.filter(
        (models.Owner.full_name.ilike(term))
        | (models.Owner.email.ilike(term))
        | (models.Owner.driver_license_no.ilike(term))
    ).limit(20).all()

    # Registration query - join through vehicles
    reg_q = db.query(models.Registration).join(models.Vehicle)
    if current_user.role != "admin":
        reg_q = reg_q.filter(models.Vehicle.user_id == current_user.id)

    registrations = reg_q.filter(
        (models.Registration.registration_number.ilike(term))
        | (models.Registration.issuing_authority.ilike(term))
    ).limit(20).all()

    # Insurance query
    ins_q = db.query(models.InsurancePolicy).join(models.Vehicle)
    if current_user.role != "admin":
        ins_q = ins_q.filter(models.Vehicle.user_id == current_user.id)

    policies = ins_q.filter(
        (models.InsurancePolicy.policy_number.ilike(term))
        | (models.InsurancePolicy.insurance_provider.ilike(term))
    ).limit(20).all()

    return {
        "vehicles": [schemas.VehicleOut.model_validate(v) for v in vehicles],
        "owners": [schemas.OwnerOut.model_validate(o) for o in owners],
        "registrations": [schemas.RegistrationOut.model_validate(r) for r in registrations],
        "policies": [schemas.InsurancePolicyOut.model_validate(p) for p in policies],
    }
