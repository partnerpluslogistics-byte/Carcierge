#!/usr/bin/env python3
"""
Carcierge Load Test Suite
=========================
Simulates 1000 new users + concurrent admin management workflows.

Scenarios covered
-----------------
NewUserFlow (weight=9):
  Phase 1 – Account creation      : POST /auth/register  → GET /auth/me
  Phase 2 – Vehicle setup (1-5)   : POST /vehicles  →  registrations / insurance / inspections
  Phase 3 – Service requests      : POST /service-requests  (one per vehicle)
  Phase 4 – Payment process       : POST /subscriptions → POST /bank-transfers → confirm
  Ongoing  – Browsing tasks       : dashboard, notifications, search, profile updates

AdminFlow (weight=1):
  Continuously picks up Pending service requests → In Progress → Completed
  Approves (80%) or rejects (20%) confirmed bank transfers
  Monitors analytics, users, vehicles, payments

Flow-level timings are emitted as synthetic "FLOW" request events so Locust
tracks p50/p95/p99 for each complete user journey segment alongside per-request
latencies.

Usage
-----
# Headless – 1 000 users, ramp at 10/s, run 15 minutes, export HTML + CSV
locust -f locustfile.py --host=http://localhost:8000 \\
       --users=1000 --spawn-rate=10 --headless \\
       --run-time=15m --html=report.html --csv=results

# Interactive web UI (open http://localhost:8089 in your browser)
locust -f locustfile.py --host=http://localhost:8000
"""

from __future__ import annotations

import random
import string
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timedelta

from locust import HttpUser, between, events, task
from locust.exception import StopUser


# ─── Run-unique suffix (prevents email/plate collisions between test runs) ────
# Generated once per Locust process; survives across task iterations.
_RUN_ID = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

# ─── Thread-safe counters ─────────────────────────────────────────────────────

_lock = threading.Lock()
_user_counter: int = 0
_plate_counter: int = 0


def _next_user_num() -> int:
    global _user_counter
    with _lock:
        _user_counter += 1
        return _user_counter


def _next_plate_num() -> int:
    global _plate_counter
    with _lock:
        _plate_counter += 1
        return _plate_counter


# ─── Static reference data ────────────────────────────────────────────────────

_MAKES         = ["Toyota", "Honda", "Ford", "BMW", "Mercedes", "Audi",
                  "Hyundai", "Kia", "Nissan", "Chevrolet", "Volkswagen"]
_MODELS        = ["Camry", "Civic", "Mustang", "3 Series", "C-Class", "A4",
                  "Tucson", "Sportage", "Altima", "Malibu", "Golf"]
_COLORS        = ["Red", "Blue", "White", "Black", "Silver", "Gray",
                  "Green", "Yellow", "Orange", "Brown"]
_COUNTRIES     = ["US", "UK", "CA", "AU", "LB", "AE", "FR", "DE", "SA"]
_ENGINE_TYPES  = ["Petrol", "Diesel", "Electric", "Hybrid"]
_VEH_TYPES     = ["Car", "Bike"]
_COVERAGES     = ["Comprehensive", "Third Party", "Collision", "Liability"]
_INSURERS      = ["Allstate", "Geico", "Progressive", "State Farm",
                  "Liberty Mutual", "Farmers", "USAA", "Nationwide"]
_AUTHORITIES   = ["DMV", "RTA", "DVLA", "VicRoads", "Transport Canada",
                  "MoT", "ADNOC", "MVPI"]
_PAY_METHODS   = ["bank_transfer", "whish", "omt", "payment_link"]
_SR_TYPES      = [
    "Registration Renewal",
    "Insurance Update",
    "Vehicle Inspection",
    "Title Transfer",
    "Plate Replacement",
    "Emissions Test",
    "General Inquiry",
    "Roadside Assistance",
    "Ownership Transfer",
    "Lost Document Replacement",
]
_SR_NOTES      = [
    "Please expedite this request.",
    "Standard processing is fine.",
    "This is time-sensitive – renewal deadline approaching.",
    "No rush, whenever convenient.",
    "Need this completed by end of month.",
    "First time using this service.",
    "Please confirm via email when done.",
]
_SEARCH_TERMS  = ["Toyota", "Honda", "Ford", "2022", "2023", "Red", "Black",
                  "Civic", "Camry", "LB", "US", "Comprehensive"]

ADMIN_EMAIL    = "PartnerPluslogistics@gmail.com"
ADMIN_PASSWORD = "Admin@123"


# ─── Data factories ───────────────────────────────────────────────────────────

def _user_payload(uid: int) -> dict:
    return {
        "email":        f"lt{_RUN_ID}{uid}@loadtest.example.com",
        "name":         f"Load Test User {uid}",
        "phone_number": f"+1555{uid:07d}",
        "password":     "LoadTest@Secure1!",
    }


def _vehicle_payload() -> dict:
    n = _next_plate_num()
    return {
        "plate_number":   f"{_RUN_ID[:4].upper()}{n:07d}",
        "vehicle_type":   random.choice(_VEH_TYPES),
        "make":           random.choice(_MAKES),
        "model":          random.choice(_MODELS),
        "year":           random.randint(2010, 2025),
        "color":          random.choice(_COLORS),
        "engine_type":    random.choice(_ENGINE_TYPES),
        "mileage":        random.randint(0, 180_000),
        "country":        random.choice(_COUNTRIES),
        "vin":            f"VIN{random.randint(10_000_000, 99_999_999)}",
        "engine_number":  f"ENG{random.randint(100_000, 999_999)}",
    }


def _registration_payload() -> dict:
    now = datetime.utcnow()
    return {
        "registration_number": f"REG{random.randint(100_000, 999_999)}",
        "issuing_authority":   random.choice(_AUTHORITIES),
        "registration_date":   now.isoformat(),
        "expiry_date":         (now + timedelta(days=365)).isoformat(),
        "country":             random.choice(_COUNTRIES),
        "status":              "Active",
    }


def _insurance_payload() -> dict:
    now = datetime.utcnow()
    return {
        "policy_number":      f"POL{random.randint(100_000, 999_999)}",
        "insurance_provider": random.choice(_INSURERS),
        "coverage_type":      random.choice(_COVERAGES),
        "country":            random.choice(_COUNTRIES),
        "premium_amount":     str(round(random.uniform(300, 3000), 2)),
        "policy_start_date":  now.isoformat(),
        "policy_end_date":    (now + timedelta(days=365)).isoformat(),
        "status":             "Active",
    }


def _inspection_payload() -> dict:
    now = datetime.utcnow()
    return {
        "inspection_date": now.isoformat(),
        "expiry_date":     (now + timedelta(days=180)).isoformat(),
        "invoice_number":  f"INV{random.randint(100_000, 999_999)}",
        "country":         random.choice(_COUNTRIES),
        "status":          "Active",
    }


def _service_request_payload(vehicle_id: int | None = None) -> dict:
    return {
        "request_type": random.choice(_SR_TYPES),
        "vehicle_id":   vehicle_id,
        "notes":        random.choice(_SR_NOTES),
    }


# ─── Flow timing helper ───────────────────────────────────────────────────────

@contextmanager
def flow_timer(environment, name: str):
    """
    Emits a synthetic Locust 'FLOW' request event so whole-journey
    durations appear alongside per-request stats in the Locust report.
    """
    t0 = time.perf_counter()
    exc_caught = None
    try:
        yield
    except Exception as exc:
        exc_caught = exc
        raise
    finally:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        environment.events.request.fire(
            request_type="FLOW",
            name=name,
            response_time=elapsed_ms,
            response_length=0,
            exception=exc_caught,
            context={},
        )


# ─── NEW USER FLOW ────────────────────────────────────────────────────────────

class NewUserFlow(HttpUser):
    """
    Complete journey for a brand-new user:

    on_start (runs once per virtual user):
      Phase 1 – Register + verify session              → measured as FLOW: account_creation
      Phase 2 – Create 1-5 vehicles with full docs    → measured as FLOW: add_all_vehicles
                 Each vehicle: registration + insurance + inspection + service request
                                                       → measured as FLOW: single_vehicle_setup
      Phase 3 – Subscribe + bank transfer + confirm  → measured as FLOW: payment_process

    @task loop (ongoing browsing after setup):
      Dashboard, vehicles, service requests, notifications, search, profile edits, etc.
    """

    weight    = 9
    wait_time = between(1, 4)

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def on_start(self) -> None:
        self.token:               str | None  = None
        self.user_id:             int | None  = None
        self.vehicle_ids:         list[int]   = []
        self.service_request_ids: list[int]   = []
        self.subscription_id:     int | None  = None
        self.transfer_id:         int | None  = None

        uid = _next_user_num()

        # ── Phase 1: Account creation ──────────────────────────────────────────
        with flow_timer(self.environment, "FLOW: account_creation"):
            with self.client.post(
                "/api/auth/register",
                json=_user_payload(uid),
                name="[user] register",
                catch_response=True,
            ) as resp:
                if resp.status_code == 201:
                    data = resp.json()
                    self.token   = data["access_token"]
                    self.user_id = data["user"]["id"]
                    resp.success()
                else:
                    resp.failure(
                        f"Registration failed {resp.status_code}: {resp.text[:300]}"
                    )
                    raise StopUser()

        # Verify authenticated session
        self.client.get(
            "/api/auth/me",
            headers=self._auth(),
            name="[user] auth/me",
        )

        # Initial dashboard visit (simulates app landing after register)
        self.client.get(
            "/api/dashboard/summary",
            headers=self._auth(),
            name="[user] dashboard/summary",
        )

        # ── Phase 2: Vehicle setup (1-5 vehicles) ──────────────────────────────
        num_vehicles = random.randint(1, 5)

        with flow_timer(self.environment, "FLOW: add_all_vehicles"):
            for _ in range(num_vehicles):
                self._create_vehicle_with_docs()

        # ── Phase 3: Payment process ───────────────────────────────────────────
        with flow_timer(self.environment, "FLOW: payment_process"):
            self._subscribe_and_pay()

    # ── Helper: create one vehicle + all sub-resources ────────────────────────

    def _create_vehicle_with_docs(self) -> None:
        """
        Create one vehicle then immediately add:
          - registration record
          - insurance policy
          - inspection record
          - service request
        Times the entire per-vehicle setup as FLOW: single_vehicle_setup.
        """
        with flow_timer(self.environment, "FLOW: single_vehicle_setup"):

            # Create vehicle
            with self.client.post(
                "/api/vehicles",
                json=_vehicle_payload(),
                headers=self._auth(),
                name="[user] vehicles/create",
                catch_response=True,
            ) as resp:
                if resp.status_code != 201:
                    resp.failure(
                        f"Vehicle create failed {resp.status_code}: {resp.text[:300]}"
                    )
                    return
                vehicle_id = resp.json()["id"]
                self.vehicle_ids.append(vehicle_id)

            # Registration
            self.client.post(
                f"/api/vehicles/{vehicle_id}/registrations",
                json=_registration_payload(),
                headers=self._auth(),
                name="[user] vehicles/{id}/registrations/create",
            )

            # Insurance policy
            self.client.post(
                f"/api/vehicles/{vehicle_id}/insurance-policies",
                json=_insurance_payload(),
                headers=self._auth(),
                name="[user] vehicles/{id}/insurance-policies/create",
            )

            # Inspection
            self.client.post(
                f"/api/vehicles/{vehicle_id}/inspections",
                json=_inspection_payload(),
                headers=self._auth(),
                name="[user] vehicles/{id}/inspections/create",
            )

            # Service request tied to this vehicle
            sr = self.client.post(
                "/api/service-requests",
                json=_service_request_payload(vehicle_id),
                headers=self._auth(),
                name="[user] service-requests/create",
            )
            if sr.status_code == 201:
                self.service_request_ids.append(sr.json()["id"])

    # ── Helper: subscription + bank transfer + confirm ────────────────────────

    def _subscribe_and_pay(self) -> None:
        """
        Create subscription → create bank transfer (linked to subscription)
        → user confirms transfer.
        """
        sub = self.client.post(
            "/api/subscriptions",
            json={"amount": "50.00", "currency": "USD"},
            headers=self._auth(),
            name="[user] subscriptions/create",
        )
        if sub.status_code != 201:
            return
        self.subscription_id = sub.json()["id"]

        bt = self.client.post(
            "/api/bank-transfers",
            json={
                "payment_type":    "subscription",
                "payment_method":  random.choice(_PAY_METHODS),
                "amount":          "50.00",
                "currency":        "USD",
                "subscription_id": self.subscription_id,
                "reference_number": f"REF{random.randint(1_000_000, 9_999_999)}",
                "transfer_note":   "Subscription payment – load test run",
            },
            headers=self._auth(),
            name="[user] bank-transfers/create",
        )
        if bt.status_code != 201:
            return
        self.transfer_id = bt.json()["id"]

        # User confirms that the wire was sent
        self.client.post(
            f"/api/bank-transfers/{self.transfer_id}/confirm",
            headers=self._auth(),
            name="[user] bank-transfers/{id}/confirm",
        )

    # ── Auth header helper ─────────────────────────────────────────────────────

    def _auth(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    # ── Ongoing browsing tasks ─────────────────────────────────────────────────
    # These run continuously after on_start completes, simulating daily usage.

    @task(4)
    def browse_dashboard(self) -> None:
        self.client.get(
            "/api/dashboard/summary",
            headers=self._auth(),
            name="[user] dashboard/summary",
        )

    @task(3)
    def view_vehicles_list(self) -> None:
        self.client.get(
            "/api/vehicles",
            headers=self._auth(),
            name="[user] vehicles/list",
        )

    @task(3)
    def view_my_service_requests(self) -> None:
        self.client.get(
            "/api/service-requests/mine",
            headers=self._auth(),
            name="[user] service-requests/mine",
        )

    @task(2)
    def check_notifications(self) -> None:
        self.client.get(
            "/api/notifications",
            headers=self._auth(),
            name="[user] notifications/list",
        )
        self.client.get(
            "/api/notifications/unread-count",
            headers=self._auth(),
            name="[user] notifications/unread-count",
        )

    @task(2)
    def view_expiry_alerts(self) -> None:
        self.client.get(
            "/api/dashboard/expiry-alerts",
            headers=self._auth(),
            name="[user] dashboard/expiry-alerts",
        )

    @task(2)
    def view_my_payments(self) -> None:
        self.client.get(
            "/api/payments/mine",
            headers=self._auth(),
            name="[user] payments/mine",
        )

    @task(2)
    def view_my_transfers(self) -> None:
        self.client.get(
            "/api/bank-transfers/mine",
            headers=self._auth(),
            name="[user] bank-transfers/mine",
        )

    @task(2)
    def view_my_subscriptions(self) -> None:
        self.client.get(
            "/api/subscriptions/mine",
            headers=self._auth(),
            name="[user] subscriptions/mine",
        )
        # 404 is expected when admin hasn't yet approved the bank transfer
        with self.client.get(
            "/api/subscriptions/active",
            headers=self._auth(),
            name="[user] subscriptions/active",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Unexpected {resp.status_code}: {resp.text[:200]}")

    @task(1)
    def view_calendar_events(self) -> None:
        self.client.get(
            "/api/dashboard/calendar-events",
            headers=self._auth(),
            name="[user] dashboard/calendar-events",
        )

    @task(1)
    def global_search(self) -> None:
        term = random.choice(_SEARCH_TERMS)
        self.client.get(
            f"/api/search?q={term}",
            headers=self._auth(),
            name="[user] search",
        )

    @task(1)
    def view_specific_vehicle(self) -> None:
        if self.vehicle_ids:
            vid = random.choice(self.vehicle_ids)
            self.client.get(
                f"/api/vehicles/{vid}",
                headers=self._auth(),
                name="[user] vehicles/{id}",
            )

    @task(1)
    def view_specific_service_request(self) -> None:
        if self.service_request_ids:
            sr_id = random.choice(self.service_request_ids)
            self.client.get(
                f"/api/service-requests/{sr_id}",
                headers=self._auth(),
                name="[user] service-requests/{id}",
            )

    @task(1)
    def view_registration_details(self) -> None:
        if self.vehicle_ids:
            vid = random.choice(self.vehicle_ids)
            self.client.get(
                f"/api/vehicles/{vid}/registrations",
                headers=self._auth(),
                name="[user] vehicles/{id}/registrations/list",
            )

    @task(1)
    def view_insurance_details(self) -> None:
        if self.vehicle_ids:
            vid = random.choice(self.vehicle_ids)
            self.client.get(
                f"/api/vehicles/{vid}/insurance-policies",
                headers=self._auth(),
                name="[user] vehicles/{id}/insurance-policies/list",
            )

    @task(1)
    def view_inspection_details(self) -> None:
        if self.vehicle_ids:
            vid = random.choice(self.vehicle_ids)
            self.client.get(
                f"/api/vehicles/{vid}/inspections",
                headers=self._auth(),
                name="[user] vehicles/{id}/inspections/list",
            )

    @task(1)
    def cancel_a_service_request(self) -> None:
        """5% chance to cancel the most recently created service request."""
        if self.service_request_ids and random.random() < 0.05:
            sr_id = self.service_request_ids[-1]
            resp = self.client.post(
                f"/api/service-requests/{sr_id}/cancel",
                headers=self._auth(),
                name="[user] service-requests/{id}/cancel",
            )
            if resp.status_code == 200:
                self.service_request_ids.remove(sr_id)

    @task(1)
    def update_profile(self) -> None:
        """10% chance to update profile fields – simulates occasional edits."""
        if random.random() < 0.10:
            self.client.put(
                "/api/users/profile",
                json={"phone_number": f"+1{random.randint(1_000_000_000, 9_999_999_999)}"},
                headers=self._auth(),
                name="[user] users/profile/update",
            )

    @task(1)
    def update_notification_prefs(self) -> None:
        """5% chance to toggle notification preferences."""
        if random.random() < 0.05:
            self.client.put(
                "/api/users/notifications",
                json={
                    "notify_by_email":    random.choice([True, False]),
                    "notify_registration": random.choice([True, False]),
                    "notify_insurance":   random.choice([True, False]),
                    "notify_inspection":  random.choice([True, False]),
                },
                headers=self._auth(),
                name="[user] users/notifications/update",
            )

    @task(1)
    def search_vehicles(self) -> None:
        term = random.choice(_SEARCH_TERMS)
        self.client.get(
            f"/api/vehicles/search?q={term}",
            headers=self._auth(),
            name="[user] vehicles/search",
        )

    @task(1)
    def check_expiring_registrations(self) -> None:
        self.client.get(
            "/api/registrations/expiring?threshold=30",
            headers=self._auth(),
            name="[user] registrations/expiring",
        )

    @task(1)
    def check_expiring_insurance(self) -> None:
        self.client.get(
            "/api/insurance/expiring?threshold=30",
            headers=self._auth(),
            name="[user] insurance/expiring",
        )

    @task(1)
    def check_expiring_inspections(self) -> None:
        self.client.get(
            "/api/inspections/expiring?threshold=30",
            headers=self._auth(),
            name="[user] inspections/expiring",
        )


# ─── ADMIN FLOW ───────────────────────────────────────────────────────────────

class AdminFlow(HttpUser):
    """
    Simulates one or more admin operators:

    on_start  – Login as admin.

    @task loop:
      - Process service requests (Pending → In Progress → Completed)
      - Approve (80%) or reject (20%) confirmed bank transfers
      - Monitor analytics, user list, vehicle list, payments, subscriptions
    """

    weight    = 1
    wait_time = between(2, 6)

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def on_start(self) -> None:
        self.token: str | None = None

        with flow_timer(self.environment, "FLOW: admin_login"):
            resp = self.client.post(
                "/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                name="[admin] auth/login",
            )

        if resp.status_code == 200:
            self.token = resp.json()["access_token"]
        else:
            raise StopUser()

    def _auth(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    # ── Service-request management ────────────────────────────────────────────

    @task(4)
    def process_service_requests(self) -> None:
        """
        Scenario: admin reviews queue, advances one Pending → In Progress,
        and completes one In Progress → Completed.
        """
        resp = self.client.get(
            "/api/service-requests/all",
            headers=self._auth(),
            name="[admin] service-requests/all",
        )
        if resp.status_code != 200:
            return

        all_requests = resp.json()
        pending     = [r for r in all_requests if r["status"] == "Pending"]
        in_progress = [r for r in all_requests if r["status"] == "In Progress"]

        # Pick up a pending request
        if pending:
            sr = random.choice(pending)
            with flow_timer(self.environment, "FLOW: admin_pickup_service_request"):
                self.client.put(
                    f"/api/service-requests/{sr['id']}/status",
                    json={
                        "status":      "In Progress",
                        "admin_notes": "Picked up – processing now.",
                    },
                    headers=self._auth(),
                    name="[admin] service-requests/{id}/status → In Progress",
                )

        # Complete an in-progress request
        if in_progress:
            sr = random.choice(in_progress)
            with flow_timer(self.environment, "FLOW: admin_complete_service_request"):
                self.client.put(
                    f"/api/service-requests/{sr['id']}/status",
                    json={
                        "status":      "Completed",
                        "admin_notes": "Completed – all documents processed.",
                    },
                    headers=self._auth(),
                    name="[admin] service-requests/{id}/status → Completed",
                )

    # ── Bank-transfer management ──────────────────────────────────────────────

    @task(3)
    def process_pending_transfers(self) -> None:
        """
        Scenario: admin reviews pending transfers, approves 80% and rejects 20%.
        Only processes user-confirmed transfers (ready for admin action).
        """
        resp = self.client.get(
            "/api/bank-transfers/pending",
            headers=self._auth(),
            name="[admin] bank-transfers/pending",
        )
        if resp.status_code != 200:
            return

        transfers = resp.json()
        # Process up to 5 per task invocation to keep the queue draining
        actionable = [t for t in transfers if t.get("confirmed_by_user")][:5]

        for transfer in actionable:
            if random.random() < 0.80:
                # Approve (80%)
                with flow_timer(self.environment, "FLOW: admin_approve_transfer"):
                    with self.client.post(
                        f"/api/bank-transfers/{transfer['id']}/approve",
                        headers=self._auth(),
                        name="[admin] bank-transfers/{id}/approve",
                        catch_response=True,
                    ) as resp:
                        # 400 = already approved/rejected by another admin worker — not a failure
                        if resp.status_code in (200, 400):
                            resp.success()
                        else:
                            resp.failure(f"Unexpected {resp.status_code}: {resp.text[:200]}")
            else:
                # Reject (20%)
                with flow_timer(self.environment, "FLOW: admin_reject_transfer"):
                    with self.client.post(
                        f"/api/bank-transfers/{transfer['id']}/reject",
                        json={
                            "rejection_reason": "Bank reference number could not be verified.",
                            "admin_notes":      "Rejected during load-test run – please resubmit.",
                        },
                        headers=self._auth(),
                        name="[admin] bank-transfers/{id}/reject",
                        catch_response=True,
                    ) as resp:
                        # 400 = already processed by another admin worker — not a failure
                        if resp.status_code in (200, 400):
                            resp.success()
                        else:
                            resp.failure(f"Unexpected {resp.status_code}: {resp.text[:200]}")

    # ── Monitoring tasks ──────────────────────────────────────────────────────

    @task(3)
    def view_analytics(self) -> None:
        self.client.get(
            "/api/admin/analytics",
            headers=self._auth(),
            name="[admin] analytics",
        )

    @task(2)
    def list_all_users(self) -> None:
        self.client.get(
            "/api/admin/users",
            headers=self._auth(),
            name="[admin] users/list",
        )

    @task(2)
    def list_all_vehicles(self) -> None:
        self.client.get(
            "/api/admin/vehicles",
            headers=self._auth(),
            name="[admin] vehicles/list",
        )

    @task(2)
    def list_all_transfers(self) -> None:
        self.client.get(
            "/api/bank-transfers/all",
            headers=self._auth(),
            name="[admin] bank-transfers/all",
        )

    @task(2)
    def list_all_payments(self) -> None:
        self.client.get(
            "/api/payments/all",
            headers=self._auth(),
            name="[admin] payments/all",
        )

    @task(2)
    def list_all_service_requests(self) -> None:
        """Periodic full refresh of the service-request queue."""
        self.client.get(
            "/api/service-requests/all",
            headers=self._auth(),
            name="[admin] service-requests/all (monitor)",
        )

    @task(1)
    def list_all_subscriptions(self) -> None:
        self.client.get(
            "/api/subscriptions/all",
            headers=self._auth(),
            name="[admin] subscriptions/all",
        )

    @task(1)
    def list_all_owners(self) -> None:
        self.client.get(
            "/api/admin/owners",
            headers=self._auth(),
            name="[admin] owners/list",
        )

    @task(1)
    def trigger_expiry_reminders(self) -> None:
        """Manually trigger the scheduler job – low frequency (5% of task invocations)."""
        if random.random() < 0.05:
            self.client.post(
                "/api/admin/trigger-reminders",
                headers=self._auth(),
                name="[admin] trigger-reminders",
            )
