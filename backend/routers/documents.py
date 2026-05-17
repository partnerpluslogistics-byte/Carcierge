import os
import uuid
from datetime import datetime
from typing import List, Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/documents", response_model=List[schemas.DocumentOut])
def list_documents(
    vehicle_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Document)
    if current_user.role != "admin":
        q = q.join(models.Vehicle).filter(models.Vehicle.user_id == current_user.id)
    if vehicle_id:
        q = q.filter(models.Document.vehicle_id == vehicle_id)
    return q.order_by(models.Document.created_at.desc()).all()


@router.post("/documents", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: schemas.DocumentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    doc = models.Document(
        uploaded_by=current_user.id,
        **payload.model_dump(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    v = db.query(models.Vehicle).filter(models.Vehicle.id == doc.vehicle_id).first()
    if current_user.role != "admin" and (not v or v.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Remove physical file if stored locally
    if doc.file_key:
        file_path = os.path.join(UPLOAD_DIR, doc.file_key)
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(doc)
    db.commit()


@router.post("/documents/upload", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    vehicle_id: int = Form(...),
    document_type: Optional[str] = Form(None),
    file_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role != "admin" and v.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Generate unique filename
    ext = os.path.splitext(file.filename or "file")[1]
    file_key = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, file_key)

    # Save file
    async with aiofiles.open(file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    file_url = f"/uploads/{file_key}"

    doc = models.Document(
        vehicle_id=vehicle_id,
        file_name=file_name or file.filename or file_key,
        document_type=document_type,
        file_key=file_key,
        file_url=file_url,
        mime_type=file.content_type,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc
