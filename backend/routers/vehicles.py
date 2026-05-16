import csv
import io
import random
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["Vehicles"])

VEHICLE_LIMIT = 5


# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_vehicle_code(db: Session) -> str:
    """Generate a unique 5-character alphanumeric uppercase vehicle code."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(100):
        code = "".join(random.choices(chars, k=5))
        if not db.query(models.Vehicle).filter(models.Vehicle.vehicle_code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate unique vehicle code")


def load_vehicle_with_relations(db: Session, vehicle_id: int) -> models.Vehicle:
    v = (
        db.query(models.Vehicle)
        .options(
            joinedload(models.Vehicle.owner),
            joinedload(models.Vehicle.registrations),
            joinedload(models.Vehicle.insurance_policies),
            joinedload(models.Vehicle.inspections),
            joinedload(models.Vehicle.documents),
        )
        .filter(models.Vehicle.id == vehicle_id)
        .first()
    )
    return v


# ─── User Vehicle Endpoints ───────────────────────────────────────────────────

@router.get("/vehicles", response_model=List[schemas.VehicleWithRelations])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vehicles = (
        db.query(models.Vehicle)
        .options(
            joinedload(models.Vehicle.owner),
            joinedload(models.Vehicle.registrations),
            joinedload(models.Vehicle.insurance_policies),
            joinedload(models.Vehicle.inspections),
            joinedload(models.Vehicle.documents),
        )
        .filter(models.Vehicle.user_id == current_user.id)
        .order_by(models.Vehicle.created_at.desc())
        .all()
    )
    return vehicles


@router.get("/vehicles/search", response_model=List[schemas.VehicleWithRelations])
def search_vehicles(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    term = f"%{q}%"
    vehicles = (
        db.query(models.Vehicle)
        .options(
            joinedload(models.Vehicle.owner),
            joinedload(models.Vehicle.registrations),
            joinedload(models.Vehicle.insurance_policies),
            joinedload(models.Vehicle.inspections),
            joinedload(models.Vehicle.documents),
        )
        .filter(
            models.Vehicle.user_id == current_user.id,
            (
                models.Vehicle.plate_number.ilike(term)
                | models.Vehicle.make.ilike(term)
                | models.Vehicle.model.ilike(term)
                | models.Vehicle.vehicle_code.ilike(term)
                | models.Vehicle.vin.ilike(term)
            ),
        )
        .all()
    )
    return vehicles


@router.get("/vehicles/{vehicle_id}", response_model=schemas.VehicleWithRelations)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = load_vehicle_with_relations(db, vehicle_id)
    if not v or v.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v


@router.post("/vehicles", response_model=schemas.VehicleWithRelations, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Enforce vehicle limit for non-admin users
    if current_user.role != "admin":
        count = db.query(models.Vehicle).filter(models.Vehicle.user_id == current_user.id).count()
        if count >= VEHICLE_LIMIT:
            raise HTTPException(
                status_code=400,
                detail=f"Vehicle limit of {VEHICLE_LIMIT} reached. Please contact support to add more.",
            )

    # Check plate uniqueness
    existing = db.query(models.Vehicle).filter(models.Vehicle.plate_number == payload.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plate number already registered")

    if payload.owner_id:
        owner = db.query(models.Owner).filter(
            models.Owner.id == payload.owner_id,
            models.Owner.user_id == current_user.id,
        ).first()
        if not owner:
            raise HTTPException(status_code=400, detail="Owner not found")

    vehicle = models.Vehicle(
        user_id=current_user.id,
        vehicle_code=generate_vehicle_code(db),
        **payload.model_dump(),
    )
    db.add(vehicle)
    db.commit()

    # Log history
    history = models.VehicleHistory(
        vehicle_id=vehicle.id,
        user_id=current_user.id,
        action="created",
        details=f"Vehicle created with plate {vehicle.plate_number}",
    )
    db.add(history)
    db.commit()

    return load_vehicle_with_relations(db, vehicle.id)


@router.put("/vehicles/{vehicle_id}", response_model=schemas.VehicleWithRelations)
def update_vehicle(
    vehicle_id: int,
    payload: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Non-admins can only edit their own vehicles
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    data = payload.model_dump(exclude_unset=True)

    if "plate_number" in data and data["plate_number"] != v.plate_number:
        existing = db.query(models.Vehicle).filter(models.Vehicle.plate_number == data["plate_number"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Plate number already registered")

    if "owner_id" in data and data["owner_id"]:
        owner = db.query(models.Owner).filter(models.Owner.id == data["owner_id"]).first()
        if not owner:
            raise HTTPException(status_code=400, detail="Owner not found")

    for field, value in data.items():
        setattr(v, field, value)

    v.updated_at = datetime.utcnow()
    db.commit()

    # Log history
    db.add(models.VehicleHistory(
        vehicle_id=v.id,
        user_id=current_user.id,
        action="updated",
        details=f"Vehicle updated: {list(data.keys())}",
    ))
    db.commit()

    return load_vehicle_with_relations(db, v.id)


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(v)
    db.commit()


# ─── Admin Vehicle Endpoints ──────────────────────────────────────────────────

@router.post("/admin/vehicles", response_model=schemas.VehicleWithRelations, status_code=status.HTTP_201_CREATED)
def admin_create_vehicle(
    payload: schemas.AdminVehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    # Validate target user exists
    target_user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check plate uniqueness
    existing = db.query(models.Vehicle).filter(models.Vehicle.plate_number == payload.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plate number already registered")

    if payload.owner_id:
        owner = db.query(models.Owner).filter(models.Owner.id == payload.owner_id).first()
        if not owner:
            raise HTTPException(status_code=400, detail="Owner not found")

    data = payload.model_dump()
    vehicle = models.Vehicle(
        vehicle_code=generate_vehicle_code(db),
        **data,
    )
    db.add(vehicle)
    db.commit()

    db.add(models.VehicleHistory(
        vehicle_id=vehicle.id,
        user_id=current_user.id,
        action="admin_created",
        details=f"Admin created vehicle with plate {vehicle.plate_number}",
    ))
    db.commit()

    return load_vehicle_with_relations(db, vehicle.id)


@router.get("/admin/vehicles", response_model=List[schemas.VehicleWithRelations])
def admin_list_vehicles(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    q = db.query(models.Vehicle).options(
        joinedload(models.Vehicle.owner),
        joinedload(models.Vehicle.registrations),
        joinedload(models.Vehicle.insurance_policies),
        joinedload(models.Vehicle.inspections),
        joinedload(models.Vehicle.documents),
    )
    if user_id is not None:
        q = q.filter(models.Vehicle.user_id == user_id)
    return q.order_by(models.Vehicle.created_at.desc()).all()


@router.post("/admin/vehicles/bulk-import")
def admin_bulk_import_vehicles(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    """
    CSV bulk import. Expected columns (case-insensitive):
    user_id, plate_number, vehicle_type, make, model, year, color,
    engine_type, vin, engine_number, mileage, country, payment_status, owner_id
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    created = []
    errors = []

    for i, row in enumerate(reader, start=2):  # row 1 is header
        try:
            # Normalise keys
            row = {k.strip().lower(): v.strip() for k, v in row.items()}

            user_id = int(row.get("user_id", 0))
            plate_number = row.get("plate_number", "").upper()

            if not user_id or not plate_number:
                errors.append({"row": i, "error": "user_id and plate_number are required"})
                continue

            target_user = db.query(models.User).filter(models.User.id == user_id).first()
            if not target_user:
                errors.append({"row": i, "error": f"User {user_id} not found"})
                continue

            if db.query(models.Vehicle).filter(models.Vehicle.plate_number == plate_number).first():
                errors.append({"row": i, "error": f"Plate {plate_number} already registered"})
                continue

            vehicle = models.Vehicle(
                user_id=user_id,
                vehicle_code=generate_vehicle_code(db),
                plate_number=plate_number,
                vehicle_type=row.get("vehicle_type", "Car"),
                make=row.get("make") or None,
                model=row.get("model") or None,
                year=int(row["year"]) if row.get("year") else None,
                color=row.get("color") or None,
                engine_type=row.get("engine_type") or None,
                vin=row.get("vin") or None,
                engine_number=row.get("engine_number") or None,
                mileage=int(row["mileage"]) if row.get("mileage") else None,
                country=row.get("country") or None,
                payment_status=row.get("payment_status", "pending_payment"),
                owner_id=int(row["owner_id"]) if row.get("owner_id") else None,
            )
            db.add(vehicle)
            db.commit()

            db.add(models.VehicleHistory(
                vehicle_id=vehicle.id,
                user_id=current_user.id,
                action="bulk_imported",
                details="Imported via CSV bulk import",
            ))
            db.commit()

            created.append({"row": i, "vehicle_id": vehicle.id, "plate_number": plate_number})

        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {"created": created, "errors": errors, "total_created": len(created), "total_errors": len(errors)}


# ─── Registration Sub-resources ───────────────────────────────────────────────

@router.get("/vehicles/{vehicle_id}/registrations", response_model=List[schemas.RegistrationOut])
def list_registrations(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v.registrations


@router.post(
    "/vehicles/{vehicle_id}/registrations",
    response_model=schemas.RegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_registration_for_vehicle(
    vehicle_id: int,
    payload: schemas.RegistrationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")

    reg = models.Registration(vehicle_id=vehicle_id, **payload.model_dump())
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


# ─── Insurance Sub-resources ──────────────────────────────────────────────────

@router.get("/vehicles/{vehicle_id}/insurance-policies", response_model=List[schemas.InsurancePolicyOut])
def list_insurance_policies(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v.insurance_policies


@router.post(
    "/vehicles/{vehicle_id}/insurance-policies",
    response_model=schemas.InsurancePolicyOut,
    status_code=status.HTTP_201_CREATED,
)
def create_insurance_policy_for_vehicle(
    vehicle_id: int,
    payload: schemas.InsurancePolicyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")

    policy = models.InsurancePolicy(vehicle_id=vehicle_id, **payload.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


# ─── Inspection Sub-resources ─────────────────────────────────────────────────

@router.get("/vehicles/{vehicle_id}/inspections", response_model=List[schemas.InspectionOut])
def list_inspections_for_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v.inspections


@router.post(
    "/vehicles/{vehicle_id}/inspections",
    response_model=schemas.InspectionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_inspection_for_vehicle(
    vehicle_id: int,
    payload: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")

    insp = models.Inspection(vehicle_id=vehicle_id, **payload.model_dump())
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return insp


# ─── Document Sub-resources ───────────────────────────────────────────────────

@router.get("/vehicles/{vehicle_id}/documents", response_model=List[schemas.DocumentOut])
def list_documents_for_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v or (current_user.role != "admin" and v.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v.documents
