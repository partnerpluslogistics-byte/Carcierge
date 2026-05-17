from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal


# ─── User Schemas ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone_number: Optional[str] = None
    password: str
    role: Optional[str] = "user"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    phone_number: Optional[str] = None
    role: str
    notify_by_email: bool
    notify_by_push: bool
    notify_registration: bool
    notify_insurance: bool
    notify_inspection: bool
    created_at: datetime
    updated_at: datetime
    last_signed_in: Optional[datetime] = None
    archived_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone_number: Optional[str] = None


class NotificationPrefsUpdate(BaseModel):
    notify_by_email: Optional[bool] = None
    notify_by_push: Optional[bool] = None
    notify_registration: Optional[bool] = None
    notify_insurance: Optional[bool] = None
    notify_inspection: Optional[bool] = None


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None


# ─── Token Schemas ────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Owner Schemas ────────────────────────────────────────────────────────────

class OwnerCreate(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    driver_license_no: Optional[str] = None
    country: Optional[str] = None


class OwnerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    driver_license_no: Optional[str] = None
    country: Optional[str] = None


class OwnerOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: Optional[str] = None
    contact_number: Optional[str] = None
    driver_license_no: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Registration Schemas ────────────────────────────────────────────────────

class RegistrationCreate(BaseModel):
    registration_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    registration_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    country: Optional[str] = None
    status: Optional[str] = "Active"


class RegistrationUpdate(BaseModel):
    registration_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    registration_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    country: Optional[str] = None
    status: Optional[str] = None


class RegistrationOut(BaseModel):
    id: int
    vehicle_id: int
    registration_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    registration_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    country: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Insurance Policy Schemas ────────────────────────────────────────────────

class InsurancePolicyCreate(BaseModel):
    policy_number: Optional[str] = None
    insurance_provider: Optional[str] = None
    coverage_type: Optional[str] = None
    country: Optional[str] = None
    premium_amount: Optional[Decimal] = None
    policy_start_date: Optional[datetime] = None
    policy_end_date: Optional[datetime] = None
    status: Optional[str] = "Active"


class InsurancePolicyUpdate(BaseModel):
    policy_number: Optional[str] = None
    insurance_provider: Optional[str] = None
    coverage_type: Optional[str] = None
    country: Optional[str] = None
    premium_amount: Optional[Decimal] = None
    policy_start_date: Optional[datetime] = None
    policy_end_date: Optional[datetime] = None
    status: Optional[str] = None


class InsurancePolicyOut(BaseModel):
    id: int
    vehicle_id: int
    policy_number: Optional[str] = None
    insurance_provider: Optional[str] = None
    coverage_type: Optional[str] = None
    country: Optional[str] = None
    premium_amount: Optional[Decimal] = None
    policy_start_date: Optional[datetime] = None
    policy_end_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Inspection Schemas ───────────────────────────────────────────────────────

class InspectionCreate(BaseModel):
    inspection_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    invoice_number: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = "Active"


class InspectionUpdate(BaseModel):
    inspection_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    invoice_number: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None


class InspectionOut(BaseModel):
    id: int
    vehicle_id: int
    inspection_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    invoice_number: Optional[str] = None
    country: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Document Schemas ─────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    vehicle_id: int
    file_name: str
    document_type: Optional[str] = None
    file_key: Optional[str] = None
    file_url: Optional[str] = None
    mime_type: Optional[str] = None


class DocumentOut(BaseModel):
    id: int
    vehicle_id: int
    file_name: str
    document_type: Optional[str] = None
    file_key: Optional[str] = None
    file_url: Optional[str] = None
    mime_type: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Vehicle Schemas ──────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    owner_id: Optional[int] = None
    vehicle_type: Optional[str] = "Car"
    plate_number: str
    vin: Optional[str] = None
    engine_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    engine_type: Optional[str] = None
    mileage: Optional[int] = None
    country: Optional[str] = None
    payment_status: Optional[str] = "pending_payment"


class VehicleUpdate(BaseModel):
    owner_id: Optional[int] = None
    vehicle_type: Optional[str] = None
    plate_number: Optional[str] = None
    vin: Optional[str] = None
    engine_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    engine_type: Optional[str] = None
    mileage: Optional[int] = None
    country: Optional[str] = None
    payment_status: Optional[str] = None


class VehicleOut(BaseModel):
    id: int
    vehicle_code: str
    user_id: int
    owner_id: Optional[int] = None
    vehicle_type: str
    plate_number: str
    vin: Optional[str] = None
    engine_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    engine_type: Optional[str] = None
    mileage: Optional[int] = None
    country: Optional[str] = None
    payment_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VehicleWithRelations(VehicleOut):
    owner: Optional[OwnerOut] = None
    registrations: List[RegistrationOut] = []
    insurance_policies: List[InsurancePolicyOut] = []
    inspections: List[InspectionOut] = []
    documents: List[DocumentOut] = []

    model_config = {"from_attributes": True}


class AdminVehicleCreate(VehicleCreate):
    user_id: int


# ─── Service Request Schemas ──────────────────────────────────────────────────

class ServiceRequestCreate(BaseModel):
    vehicle_id: Optional[int] = None
    request_type: str
    notes: Optional[str] = None


class ServiceRequestUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    request_type: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    status: Optional[str] = None


class ServiceRequestOut(BaseModel):
    id: int
    user_id: int
    vehicle_id: Optional[int] = None
    request_type: str
    status: str
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Notification Schemas ─────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    vehicle_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Payment Schemas ──────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    service_request_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    amount: Decimal
    currency: Optional[str] = "USD"
    receipt_number: Optional[str] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("Amount must be greater than 0")
        return value

    @model_validator(mode="after")
    def must_reference_billable_record(self):
        if not self.service_request_id and not self.vehicle_id:
            raise ValueError("Payment must reference a vehicle or service request")
        return self


class PaymentOut(BaseModel):
    id: int
    service_request_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    user_id: int
    amount: Decimal
    currency: str
    receipt_number: Optional[str] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Subscription Schemas ─────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    amount: Optional[Decimal] = Decimal("50.00")
    currency: Optional[str] = "USD"

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, value: Optional[Decimal]) -> Optional[Decimal]:
        if value is not None and value <= 0:
            raise ValueError("Amount must be greater than 0")
        return value


class SubscriptionOut(BaseModel):
    id: int
    user_id: int
    status: str
    amount: Decimal
    currency: str
    start_date: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Bank Transfer Schemas ────────────────────────────────────────────────────

class BankTransferCreate(BaseModel):
    vehicle_id: Optional[int] = None
    subscription_id: Optional[int] = None
    service_request_id: Optional[int] = None
    payment_type: str  # subscription/service_request
    payment_method: Optional[str] = "bank_transfer"
    amount: Decimal
    currency: Optional[str] = "USD"
    reference_number: Optional[str] = None
    transfer_note: Optional[str] = None

    @field_validator("payment_type")
    @classmethod
    def payment_type_must_be_known(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"subscription", "service_request"}:
            raise ValueError("Payment type must be subscription or service_request")
        return normalized

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("Amount must be greater than 0")
        return value

    @model_validator(mode="after")
    def must_match_payment_type_to_record(self):
        if self.payment_type == "subscription" and self.service_request_id:
            raise ValueError("Subscription transfers cannot reference a service request")
        if self.payment_type == "subscription" and not (self.subscription_id or self.vehicle_id):
            raise ValueError("Subscription transfers must reference a subscription or vehicle")
        if self.payment_type == "service_request" and (self.subscription_id or self.vehicle_id):
            raise ValueError("Service request transfers cannot reference a subscription or vehicle")
        if self.payment_type == "service_request" and not self.service_request_id:
            raise ValueError("Service request transfers must reference a service request")
        return self


class BankTransferUpdate(BaseModel):
    reference_number: Optional[str] = None
    transfer_note: Optional[str] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class BankTransferOut(BaseModel):
    id: int
    user_id: int
    vehicle_id: Optional[int] = None
    subscription_id: Optional[int] = None
    service_request_id: Optional[int] = None
    payment_type: str
    payment_method: str
    amount: Decimal
    currency: str
    reference_number: Optional[str] = None
    transfer_note: Optional[str] = None
    confirmed_by_user: bool
    confirmed_at: Optional[datetime] = None
    approved_by_admin: bool
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Vehicle History Schema ───────────────────────────────────────────────────

class VehicleHistoryOut(BaseModel):
    id: int
    vehicle_id: int
    user_id: int
    action: str
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class VehicleBreakdown(BaseModel):
    cars: int
    bikes: int


class DashboardSummary(BaseModel):
    total_vehicles: int
    vehicle_breakdown: VehicleBreakdown
    total_registrations: int
    active_registrations: int
    expiring_registrations: int
    expired_registrations: int
    total_policies: int
    active_policies: int
    expiring_policies: int
    expired_policies: int
    total_inspections: int
    active_inspections: int
    expiring_inspections: int
    expired_inspections: int


class ExpiryAlert(BaseModel):
    vehicle_id: int
    plate_number: str
    type: str  # registration/insurance/inspection
    days_remaining: int
    expiry_date: datetime
    severity: str  # critical/warning


class CalendarEvent(BaseModel):
    date: datetime
    type: str
    label: str
    plate_number: str
    severity: str
    vehicle_id: int
