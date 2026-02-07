import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from database import engine, get_db, Base, SessionLocal
from config import get_settings
from models import (
    User, WorkerProfile, TutorProfile, Booking, Rating, AIDecisionLog,
    HOME_SERVICE_TYPES, TUTOR_SUBJECTS,
)
from schemas import (
    UserCreate, UserLogin, Token, UserResponse,
    WorkerProfileCreate, WorkerProfileResponse,
    TutorProfileCreate, TutorProfileResponse,
    BookingCreate, BookingResponse, BookingStatusUpdate,
    RatingCreate, ProviderSearchResult,
)
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_user, require_user, require_role,
)
from ai_engine import verify_identity, evaluate_tutor, compute_trust_score
from routes.chat import router as chat_router
from seed import seed_providers

settings = get_settings()
UPLOAD_DIR = settings.upload_dir
COMMISSION_RATE = settings.commission_rate


def _ensure_hourly_rate_columns():
    """Add hourly_rate to worker_profiles and tutor_profiles if using SQLite and column missing."""
    if "sqlite" not in settings.database_url:
        return
    with engine.begin() as conn:
        for table, col in [("worker_profiles", "hourly_rate"), ("tutor_profiles", "hourly_rate")]:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} REAL"))
            except Exception:
                pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _ensure_hourly_rate_columns()
    try:
        db = SessionLocal()
        seed_providers(db)
        db.close()
    except Exception:
        pass
    yield
    pass


app = FastAPI(title="AI-Governed Home Services & Tutor Marketplace", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(chat_router, prefix="/api")


# ---------- Auth ----------
@app.post("/api/auth/register", response_model=Token)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token, user=UserResponse.model_validate(user))


@app.post("/api/auth/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token, user=UserResponse.model_validate(user))


@app.get("/api/auth/me", response_model=UserResponse)
def me(user: User = Depends(require_user)):
    return UserResponse.model_validate(user)


# ---------- Constants ----------
@app.get("/api/constants/service-types")
def get_service_types():
    return {"home_services": HOME_SERVICE_TYPES, "tutor_subjects": TUTOR_SUBJECTS}


# ---------- Worker Profile ----------
@app.post("/api/workers/profile", response_model=WorkerProfileResponse)
def create_worker_profile(
    service_type: str = Form(...),
    price: float = Form(...),
    id_document: UploadFile = File(None),
    user: User = Depends(require_role("worker")),
    db: Session = Depends(get_db),
):
    if user.role != "worker":
        raise HTTPException(403, "Only workers can create worker profile")
    existing = db.query(WorkerProfile).filter(WorkerProfile.user_id == user.id).first()
    if existing:
        raise HTTPException(400, "Profile already exists")
    if service_type not in HOME_SERVICE_TYPES:
        raise HTTPException(400, f"Invalid service type. Allowed: {HOME_SERVICE_TYPES}")
    if price is None or price < 0:
        raise HTTPException(400, "Price must be a positive number")
    id_path = None
    if id_document and id_document.filename:
        ext = os.path.splitext(id_document.filename)[1] or ".bin"
        path = os.path.join(UPLOAD_DIR, f"worker_{user.id}_id{ext}")
        with open(path, "wb") as f:
            f.write(id_document.file.read())
        id_path = path
    profile = WorkerProfile(
        user_id=user.id,
        service_type=service_type,
        hourly_rate=round(float(price), 2),
        id_document_path=id_path,
        verification_status="pending",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    # Run AI identity verification
    try:
        result = verify_identity(has_id_document=bool(id_path), document_path=id_path)
        profile.verification_status = "approved" if result["approved"] else "rejected"
        db.add(AIDecisionLog(
            user_id=user.id,
            decision_type="identity_verification",
            raw_response=result.get("raw_response", ""),
        ))
        db.commit()
        db.refresh(profile)
    except Exception as e:
        profile.verification_status = "rejected"
        db.add(AIDecisionLog(user_id=user.id, decision_type="identity_verification", raw_response=str(e)))
        db.commit()
        db.refresh(profile)
    return WorkerProfileResponse.model_validate(profile)


@app.get("/api/workers/profile", response_model=WorkerProfileResponse)
def get_worker_profile(user: User = Depends(require_role("worker")), db: Session = Depends(get_db)):
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Worker profile not found")
    return WorkerProfileResponse.model_validate(profile)


# ---------- Tutor Profile ----------
@app.post("/api/tutors/profile", response_model=TutorProfileResponse)
def create_tutor_profile(
    subject: str = Form(...),
    price: float = Form(...),
    qualification_text: str = Form(""),
    experience_description: str = Form(""),
    demo_transcript: str = Form(...),
    id_document: UploadFile = File(None),
    qualification_document: UploadFile = File(None),
    user: User = Depends(require_role("tutor")),
    db: Session = Depends(get_db),
):
    if user.role != "tutor":
        raise HTTPException(403, "Only tutors can create tutor profile")
    existing = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    if existing:
        raise HTTPException(400, "Profile already exists")
    if subject not in TUTOR_SUBJECTS:
        raise HTTPException(400, f"Invalid subject. Allowed: {TUTOR_SUBJECTS}")
    if price is None or price < 0:
        raise HTTPException(400, "Price must be a positive number")
    id_path = None
    qual_path = None
    if id_document and id_document.filename:
        ext = os.path.splitext(id_document.filename)[1] or ".bin"
        path = os.path.join(UPLOAD_DIR, f"tutor_{user.id}_id{ext}")
        with open(path, "wb") as f:
            f.write(id_document.file.read())
        id_path = path
    if qualification_document and qualification_document.filename:
        ext = os.path.splitext(qualification_document.filename)[1] or ".bin"
        path = os.path.join(UPLOAD_DIR, f"tutor_{user.id}_qual{ext}")
        with open(path, "wb") as f:
            f.write(qualification_document.file.read())
        qual_path = path
    profile = TutorProfile(
        user_id=user.id,
        subject=subject,
        hourly_rate=round(float(price), 2),
        qualification_text=qualification_text or None,
        experience_description=experience_description or None,
        demo_transcript=demo_transcript,
        id_document_path=id_path,
        qualification_document_path=qual_path,
        verification_status="pending",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    # Run AI tutor evaluation
    try:
        result = evaluate_tutor(
            qualification_text=qualification_text or "",
            experience_description=experience_description or "",
            demo_transcript=demo_transcript,
        )
        profile.qualification_score = result["qualification_score"]
        profile.skill_score = result["skill_score"]
        profile.verification_status = "approved" if result["approval"] else "rejected"
        profile.profile_summary = result.get("profile_summary", "")
        db.add(AIDecisionLog(
            user_id=user.id,
            decision_type="tutor_evaluation",
            raw_response=result.get("raw_response", ""),
        ))
        db.commit()
        db.refresh(profile)
    except Exception as e:
        profile.verification_status = "rejected"
        db.add(AIDecisionLog(user_id=user.id, decision_type="tutor_evaluation", raw_response=str(e)))
        db.commit()
        db.refresh(profile)
    return TutorProfileResponse.model_validate(profile)


@app.get("/api/tutors/profile", response_model=TutorProfileResponse)
def get_tutor_profile(user: User = Depends(require_role("tutor")), db: Session = Depends(get_db)):
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Tutor profile not found")
    return TutorProfileResponse.model_validate(profile)


# ---------- Provider Search (only approved) ----------
@app.get("/api/providers/search", response_model=list[ProviderSearchResult])
def search_providers(
    service_type: str = None,
    subject: str = None,
    db: Session = Depends(get_db),
):
    results = []
    if service_type and service_type in HOME_SERVICE_TYPES:
        workers = (
            db.query(User, WorkerProfile)
            .join(WorkerProfile, User.id == WorkerProfile.user_id)
            .filter(WorkerProfile.service_type == service_type, WorkerProfile.verification_status == "approved")
            .all()
        )
        for u, p in workers:
            results.append(ProviderSearchResult(
                id=u.id, name=u.name, email=u.email, role="worker",
                trust_score=u.trust_score, service_type=p.service_type,
                verification_status=p.verification_status, rating=p.rating,
                price=p.hourly_rate,
            ))
    if subject and subject in TUTOR_SUBJECTS:
        tutors = (
            db.query(User, TutorProfile)
            .join(TutorProfile, User.id == TutorProfile.user_id)
            .filter(TutorProfile.subject == subject, TutorProfile.verification_status == "approved")
            .all()
        )
        for u, p in tutors:
            results.append(ProviderSearchResult(
                id=u.id, name=u.name, email=u.email, role="tutor",
                trust_score=u.trust_score, subject=p.subject,
                verification_status=p.verification_status,
                qualification_score=p.qualification_score, skill_score=p.skill_score,
                profile_summary=p.profile_summary, price=p.hourly_rate,
            ))
    return results


# ---------- Bookings ----------
def _booking_commission(total_price: float):
    commission = round(total_price * COMMISSION_RATE, 2)
    provider_earning = round(total_price - commission, 2)
    return commission, provider_earning


@app.post("/api/bookings", response_model=BookingResponse)
def create_booking(
    data: BookingCreate,
    user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    provider = db.query(User).filter(User.id == data.provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider not found")
    if provider.role == "worker":
        profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == provider.id).first()
        if not profile or profile.verification_status != "approved":
            raise HTTPException(400, "Provider is not approved")
        if profile.service_type != data.service_type:
            raise HTTPException(400, "Service type mismatch")
    else:
        profile = db.query(TutorProfile).filter(TutorProfile.user_id == provider.id).first()
        if not profile or profile.verification_status != "approved":
            raise HTTPException(400, "Provider is not approved")
        subject_match = (data.subject and data.subject == profile.subject) or (
            data.service_type and data.service_type == profile.subject
        )
        if not subject_match:
            raise HTTPException(400, "Subject mismatch")
    commission, provider_earning = _booking_commission(data.total_price)
    booking = Booking(
        customer_id=user.id,
        provider_id=provider.id,
        service_type=data.service_type,
        subject=data.subject,
        total_price=data.total_price,
        commission_amount=commission,
        provider_earning=provider_earning,
        status="pending",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return BookingResponse.model_validate(booking)


@app.get("/api/bookings", response_model=list[BookingResponse])
def list_bookings(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    q = db.query(Booking).filter(
        (Booking.customer_id == user.id) | (Booking.provider_id == user.id)
    ).order_by(Booking.created_at.desc())
    return [BookingResponse.model_validate(b) for b in q.all()]


@app.patch("/api/bookings/{booking_id}", response_model=BookingResponse)
def update_booking_status(
    booking_id: int,
    data: BookingStatusUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if data.status not in ("accepted", "completed", "cancelled"):
        raise HTTPException(400, "Invalid status")
    if data.status == "accepted" and booking.provider_id != user.id:
        raise HTTPException(403, "Only provider can accept")
    if data.status in ("completed", "cancelled"):
        if booking.customer_id != user.id and booking.provider_id != user.id:
            raise HTTPException(403, "Only customer or provider can complete/cancel")
    booking.status = data.status
    db.commit()
    db.refresh(booking)
    if data.status == "completed":
        # Update trust scores
        total = db.query(Booking).filter(Booking.provider_id == booking.provider_id).count()
        completed = db.query(Booking).filter(
            Booking.provider_id == booking.provider_id, Booking.status == "completed"
        ).count()
        cancelled = db.query(Booking).filter(
            Booking.provider_id == booking.provider_id, Booking.status == "cancelled"
        ).count()
        completion_rate = completed / total if total else 0
        cancellation_rate = cancelled / total if total else 0
        avg_rating = db.query(func.avg(Rating.score)).filter(Rating.provider_id == booking.provider_id).scalar() or 0
        provider_user = db.get(User, booking.provider_id)
        wp = db.query(WorkerProfile).filter(WorkerProfile.user_id == booking.provider_id).first()
        tp = db.query(TutorProfile).filter(TutorProfile.user_id == booking.provider_id).first()
        ai_approved = (wp and wp.verification_status == "approved") or (tp and tp.verification_status == "approved")
        provider_user.trust_score = compute_trust_score(ai_approved, completion_rate, cancellation_rate, avg_rating)
        db.commit()
    return BookingResponse.model_validate(booking)


# ---------- Ratings ----------
@app.post("/api/ratings")
def create_rating(
    data: RatingCreate,
    user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    if data.score < 1 or data.score > 5:
        raise HTTPException(400, "Score must be 1-5")
    rating = Rating(
        customer_id=user.id,
        provider_id=data.provider_id,
        booking_id=data.booking_id,
        score=data.score,
        comment=data.comment,
    )
    db.add(rating)
    # Update provider average rating
    avg = db.query(func.avg(Rating.score)).filter(Rating.provider_id == data.provider_id).scalar()
    provider_user = db.get(User, data.provider_id)
    wp = db.query(WorkerProfile).filter(WorkerProfile.user_id == data.provider_id).first()
    tp = db.query(TutorProfile).filter(TutorProfile.user_id == data.provider_id).first()
    if wp:
        wp.rating = avg or 0
    if tp:
        pass  # tutors use same rating logic via User/trust_score
    db.commit()
    return {"message": "Rating submitted"}


# ---------- Health ----------
@app.get("/api/health")
def health():
    return {"status": "ok"}
