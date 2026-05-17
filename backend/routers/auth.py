import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
LOGIN_RATE_LIMIT_MAX_ATTEMPTS = int(os.getenv("LOGIN_RATE_LIMIT_MAX_ATTEMPTS", "5"))
LOGIN_RATE_LIMIT_WINDOW = timedelta(minutes=int(os.getenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES", "15")))
_failed_login_attempts: dict[str, list[datetime]] = {}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _login_rate_key(request: Request, email: str) -> str:
    return f"{_client_ip(request)}:{email}"


def _recent_failed_attempts(key: str) -> list[datetime]:
    cutoff = datetime.utcnow() - LOGIN_RATE_LIMIT_WINDOW
    attempts = [attempt for attempt in _failed_login_attempts.get(key, []) if attempt > cutoff]
    if attempts:
        _failed_login_attempts[key] = attempts
    else:
        _failed_login_attempts.pop(key, None)
    return attempts


def _enforce_login_rate_limit(key: str):
    if len(_recent_failed_attempts(key)) >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
        )


def _record_failed_login(key: str):
    attempts = _recent_failed_attempts(key)
    attempts.append(datetime.utcnow())
    _failed_login_attempts[key] = attempts


def _clear_failed_logins(key: str):
    _failed_login_attempts.pop(key, None)


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    existing = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = models.User(
        email=email,
        name=payload.name,
        phone_number=payload.phone_number,
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    rate_key = _login_rate_key(request, email)
    _enforce_login_rate_limit(rate_key)

    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        _record_failed_login(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.archived_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been archived",
        )

    user.last_signed_in = datetime.utcnow()
    db.commit()
    db.refresh(user)
    _clear_failed_logins(rate_key)

    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/logout")
def logout():
    """Client-side logout: discard the token."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
