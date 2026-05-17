from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/vehicle-history", tags=["Vehicle History"])


@router.get("", response_model=List[schemas.VehicleHistoryOut])
def get_vehicle_history(
    vehicle_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.VehicleHistory).filter(
        models.VehicleHistory.vehicle_id == vehicle_id
    )
    if current_user.role != "admin":
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == vehicle_id,
            models.Vehicle.user_id == current_user.id,
        ).first()
        if not vehicle:
            return []
    return query.order_by(models.VehicleHistory.created_at.desc()).all()
