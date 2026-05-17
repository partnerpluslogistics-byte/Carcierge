from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Numeric,
    ForeignKey, Text, func
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")  # user/admin

    # Notification preferences
    notify_by_email = Column(Boolean, default=True)
    notify_by_push = Column(Boolean, default=False)
    notify_registration = Column(Boolean, default=True)
    notify_insurance = Column(Boolean, default=True)
    notify_inspection = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_signed_in = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)

    # Relationships
    owners = relationship("Owner", back_populates="user", cascade="all, delete-orphan")
    vehicles = relationship("Vehicle", back_populates="user", foreign_keys="Vehicle.user_id", cascade="all, delete-orphan")
    service_requests = relationship("ServiceRequest", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", foreign_keys="Subscription.user_id", cascade="all, delete-orphan")
    bank_transfers = relationship("BankTransfer", back_populates="user", foreign_keys="BankTransfer.user_id", cascade="all, delete-orphan")


class Owner(Base):
    __tablename__ = "owners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    driver_license_no = Column(String, nullable=True)
    country = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="owners")
    vehicles = relationship("Vehicle", back_populates="owner")
    email_alerts = relationship("EmailAlert", back_populates="owner", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_code = Column(String(5), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("owners.id"), nullable=True)
    vehicle_type = Column(String, default="Car")  # Car/Bike
    plate_number = Column(String, unique=True, nullable=False, index=True)
    vin = Column(String, nullable=True)
    engine_number = Column(String, nullable=True)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    color = Column(String, nullable=True)
    engine_type = Column(String, nullable=True)  # Petrol/Diesel/Electric/Hybrid
    mileage = Column(Integer, nullable=True)
    country = Column(String, nullable=True)
    payment_status = Column(String, default="pending_payment")  # pending_payment/pending_approval/active/rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="vehicles", foreign_keys=[user_id])
    owner = relationship("Owner", back_populates="vehicles")
    registrations = relationship("Registration", back_populates="vehicle", cascade="all, delete-orphan")
    insurance_policies = relationship("InsurancePolicy", back_populates="vehicle", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="vehicle", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="vehicle", cascade="all, delete-orphan")
    service_requests = relationship("ServiceRequest", back_populates="vehicle")
    notifications = relationship("Notification", back_populates="vehicle")
    payments = relationship("Payment", back_populates="vehicle")
    vehicle_history = relationship("VehicleHistory", back_populates="vehicle", cascade="all, delete-orphan")
    bank_transfers = relationship("BankTransfer", back_populates="vehicle", foreign_keys="BankTransfer.vehicle_id")
    email_alerts = relationship("EmailAlert", back_populates="vehicle", cascade="all, delete-orphan")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    registration_number = Column(String, nullable=True)
    issuing_authority = Column(String, nullable=True)
    registration_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    country = Column(String, nullable=True)
    status = Column(String, default="Active")  # Active/Expiring Soon/Expired
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="registrations")


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    policy_number = Column(String, nullable=True)
    insurance_provider = Column(String, nullable=True)
    coverage_type = Column(String, nullable=True)  # Comprehensive/3rd Party/Mandatory
    country = Column(String, nullable=True)
    premium_amount = Column(Numeric(10, 2), nullable=True)
    policy_start_date = Column(DateTime, nullable=True)
    policy_end_date = Column(DateTime, nullable=True)
    status = Column(String, default="Active")  # Active/Expiring Soon/Expired
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="insurance_policies")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    file_name = Column(String, nullable=False)
    document_type = Column(String, nullable=True)  # Registration Certificate/Insurance Certificate/...
    file_key = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    inspection_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    invoice_number = Column(String, nullable=True)
    country = Column(String, nullable=True)
    status = Column(String, default="Active")  # Active/Expiring Soon/Expired
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="inspections")


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    request_type = Column(String, nullable=False)  # Insurance Renewal/Inspection Renewal/...
    status = Column(String, default="Pending")  # Pending/In Progress/Completed/Cancelled
    notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="service_requests")
    vehicle = relationship("Vehicle", back_populates="service_requests")
    payments = relationship("Payment", back_populates="service_request")
    bank_transfers = relationship("BankTransfer", back_populates="service_request", foreign_keys="BankTransfer.service_request_id")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")  # expiry_warning/expiry_critical/system/info
    is_read = Column(Boolean, default=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
    vehicle = relationship("Vehicle", back_populates="notifications")


class VehicleHistory(Base):
    __tablename__ = "vehicle_history"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="vehicle_history")
    user = relationship("User")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="USD")
    receipt_number = Column(String, nullable=True)
    payment_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    service_request = relationship("ServiceRequest", back_populates="payments")
    vehicle = relationship("Vehicle", back_populates="payments")
    user = relationship("User", back_populates="payments")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending_payment")  # pending_payment/pending_approval/active/expired/rejected
    amount = Column(Numeric(10, 2), default=50.00)
    currency = Column(String, default="USD")
    start_date = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subscriptions", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    bank_transfers = relationship("BankTransfer", back_populates="subscription", foreign_keys="BankTransfer.subscription_id")


class BankTransfer(Base):
    __tablename__ = "bank_transfers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=True)
    payment_type = Column(String, nullable=False)  # subscription/service_request
    payment_method = Column(String, default="bank_transfer")  # whish/omt/payment_link/bank_transfer
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="USD")
    reference_number = Column(String, nullable=True)
    transfer_note = Column(Text, nullable=True)
    confirmed_by_user = Column(Boolean, default=False)
    confirmed_at = Column(DateTime, nullable=True)
    approved_by_admin = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bank_transfers", foreign_keys=[user_id])
    vehicle = relationship("Vehicle", back_populates="bank_transfers", foreign_keys=[vehicle_id])
    subscription = relationship("Subscription", back_populates="bank_transfers", foreign_keys=[subscription_id])
    service_request = relationship("ServiceRequest", back_populates="bank_transfers", foreign_keys=[service_request_id])
    approver = relationship("User", foreign_keys=[approved_by])


class EmailAlert(Base):
    __tablename__ = "email_alerts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("owners.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # Registration 30 Days/Registration 7 Days/...
    record_id = Column(Integer, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("Owner", back_populates="email_alerts")
    vehicle = relationship("Vehicle", back_populates="email_alerts")
