import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler

from database import engine, SessionLocal
import models
from auth import hash_password, get_current_admin
from jobs import send_expiry_reminders

# Routers
from routers import auth as auth_router
from routers import users as users_router
from routers import owners as owners_router
from routers import vehicles as vehicles_router
from routers import registrations as registrations_router
from routers import insurance as insurance_router
from routers import inspections as inspections_router
from routers import documents as documents_router
from routers import dashboard as dashboard_router
from routers import service_requests as service_requests_router
from routers import payments as payments_router
from routers import subscriptions as subscriptions_router
from routers import bank_transfers as bank_transfers_router
from routers import notifications as notifications_router
from routers import admin as admin_router
from routers import vehicle_history as vehicle_history_router
from routers import search as search_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "PartnerPluslogistics@gmail.com")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")
DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"


def parse_csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_tables():
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")


def seed_admin():
    db = SessionLocal()
    try:
        admin_email = normalize_email(DEFAULT_ADMIN_EMAIL)
        existing_admin = db.query(models.User).filter(models.User.role == "admin").first()
        if not existing_admin:
            admin = models.User(
                email=admin_email,
                name="Admin",
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin)
            db.commit()
            logger.info(f"Default admin user created: {admin_email}")
        elif existing_admin.email != normalize_email(existing_admin.email):
            existing_admin.email = normalize_email(existing_admin.email)
            db.commit()
            logger.info(f"Admin email normalized: {existing_admin.email}")
        else:
            logger.info(f"Admin user already exists: {existing_admin.email}")
    except Exception as e:
        logger.error(f"Failed to seed admin user: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    seed_admin()
    scheduler = BackgroundScheduler()
    scheduler.add_job(send_expiry_reminders, 'cron', hour=8, minute=0, id='expiry_reminders')
    scheduler.start()
    logger.info("Scheduler started - expiry reminders will run daily at 08:00 UTC")
    yield
    scheduler.shutdown()
    logger.info("Scheduler shut down")


app = FastAPI(
    title="Carcierge API",
    description="Vehicle management platform backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_csv_env("CORS_ORIGINS", DEFAULT_CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files ─────────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR, html=False), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth_router.router, prefix=API_PREFIX)
app.include_router(users_router.router, prefix=API_PREFIX)
app.include_router(owners_router.router, prefix=API_PREFIX)
app.include_router(vehicles_router.router, prefix=API_PREFIX)
app.include_router(registrations_router.router, prefix=API_PREFIX)
app.include_router(insurance_router.router, prefix=API_PREFIX)
app.include_router(inspections_router.router, prefix=API_PREFIX)
app.include_router(documents_router.router, prefix=API_PREFIX)
app.include_router(dashboard_router.router, prefix=API_PREFIX)
app.include_router(service_requests_router.router, prefix=API_PREFIX)
app.include_router(payments_router.router, prefix=API_PREFIX)
app.include_router(subscriptions_router.router, prefix=API_PREFIX)
app.include_router(bank_transfers_router.router, prefix=API_PREFIX)
app.include_router(notifications_router.router, prefix=API_PREFIX)
app.include_router(admin_router.router, prefix=API_PREFIX)
app.include_router(vehicle_history_router.router, prefix=API_PREFIX)
app.include_router(search_router.router, prefix=API_PREFIX)


@app.get("/")
def root():
    return {"message": "Carcierge API is running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/admin/trigger-reminders")
def trigger_reminders(current_user: models.User = Depends(get_current_admin)):
    send_expiry_reminders()
    return {"message": "Expiry reminders triggered"}
