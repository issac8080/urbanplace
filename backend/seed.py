"""
Seed SQLite with dummy approved providers for chatbot and search testing.
Idempotent: skips if approved providers already exist.
"""
import random
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine
from config import get_settings
from models import User, WorkerProfile, TutorProfile, HOME_SERVICE_TYPES, TUTOR_SUBJECTS
from auth import get_password_hash


def _ensure_hourly_rate(db: Session) -> None:
    """Add hourly_rate columns if missing (SQLite)."""
    if "sqlite" not in get_settings().database_url:
        return
    for table, col in [("worker_profiles", "hourly_rate"), ("tutor_profiles", "hourly_rate")]:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} REAL"))
            db.commit()
        except Exception:
            db.rollback()


# Service type -> count of workers to seed
WORKER_SEED = [
    ("cleaning", 3),
    ("plumber", 3),
    ("electrician", 3),
    ("painting", 2),
    ("gardening", 2),
]
# Subject -> count of tutors
TUTOR_SEED = [
    ("mathematics", 2),
    ("coding", 2),
    ("language", 2),
]

COMMON_PASSWORD_HASH = get_password_hash("seed123")


def _random_rating() -> float:
    return round(random.uniform(3.5, 5.0), 1)


def _random_trust_score() -> float:
    return round(random.uniform(70.0, 95.0), 1)


def _random_price() -> float:
    return round(random.uniform(200.0, 1500.0), 0)


def seed_providers(db: Session) -> int:
    """Create dummy users and profiles. Returns number of profiles created."""
    _ensure_hourly_rate(db)
    created = 0
    worker_names = [
        "Raj Kumar", "Amit Sharma", "Vikram Singh", "Suresh Nair", "Deepak Patel",
        "Ramesh Iyer", "Karthik Reddy", "Anil Mehta", "Sunil Joshi", "Manoj Gupta",
        "Prakash Rao", "Sandeep Verma", "Ravi Krishnan", "Naveen Pillai",
    ]
    tutor_names = [
        "Priya Nair", "Anita Desai", "Meera Krishnan", "Kavitha Rao", "Lakshmi Iyer",
        "Divya Menon", "Shruti Patel", "Neha Sharma",
    ]
    name_idx = {"w": 0, "t": 0}

    # Workers
    for service_type, count in WORKER_SEED:
        if service_type not in HOME_SERVICE_TYPES:
            continue
        for i in range(count):
            idx = name_idx["w"] % len(worker_names)
            name = f"{worker_names[idx]} ({service_type})"
            name_idx["w"] += 1
            email = f"worker-{service_type}-{i+1}@seed.urban.local"
            if db.query(User).filter(User.email == email).first():
                continue
            user = User(
                name=name,
                email=email,
                password_hash=COMMON_PASSWORD_HASH,
                role="worker",
                trust_score=_random_trust_score(),
            )
            db.add(user)
            db.flush()
            profile = WorkerProfile(
                user_id=user.id,
                service_type=service_type,
                verification_status="approved",
                rating=_random_rating(),
                hourly_rate=_random_price(),
            )
            db.add(profile)
            created += 1

    # Tutors (use distinct names/emails)
    for subject, count in TUTOR_SEED:
        if subject not in TUTOR_SUBJECTS:
            continue
        for i in range(count):
            idx = name_idx["t"] % len(tutor_names)
            name = f"{tutor_names[idx]} ({subject})"
            name_idx["t"] += 1
            email = f"tutor-{subject}-{i+1}@seed.urban.local"
            if db.query(User).filter(User.email == email).first():
                continue
            user = User(
                name=name,
                email=email,
                password_hash=COMMON_PASSWORD_HASH,
                role="tutor",
                trust_score=_random_trust_score(),
            )
            db.add(user)
            db.flush()
            profile = TutorProfile(
                user_id=user.id,
                subject=subject,
                verification_status="approved",
                qualification_score=random.randint(70, 95),
                skill_score=random.randint(70, 95),
                hourly_rate=_random_price(),
            )
            db.add(profile)
            created += 1

    if created:
        db.commit()
    return created
