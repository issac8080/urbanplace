from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from database import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    worker = "worker"
    tutor = "tutor"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    completed = "completed"
    cancelled = "cancelled"


# Service types as constants (stored as strings)
HOME_SERVICE_TYPES = [
    "cleaning", "painting", "gardening", "electrician", "plumber",
    "appliance_repair", "carpentry"
]
TUTOR_SUBJECTS = [
    "mathematics", "science", "coding", "language", "music",
    "competitive_exam_training"
]


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # customer, worker, tutor
    trust_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False)
    tutor_profile = relationship("TutorProfile", back_populates="user", uselist=False)
    bookings_as_customer = relationship("Booking", foreign_keys="Booking.customer_id", back_populates="customer")
    bookings_as_provider = relationship("Booking", foreign_keys="Booking.provider_id", back_populates="provider")
    ratings_given = relationship("Rating", foreign_keys="Rating.customer_id", back_populates="customer")
    ratings_received = relationship("Rating", foreign_keys="Rating.provider_id", back_populates="provider")
    ai_decision_logs = relationship("AIDecisionLog", back_populates="user")


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    service_type = Column(String(100), nullable=False)
    verification_status = Column(String(50), default="pending")
    rating = Column(Float, default=0.0)
    hourly_rate = Column(Float, nullable=True)  # for chatbot recommendations
    id_document_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="worker_profile")

    @property
    def price(self):
        return self.hourly_rate


class TutorProfile(Base):
    __tablename__ = "tutor_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    subject = Column(String(100), nullable=False)
    qualification_score = Column(Float, nullable=True)
    skill_score = Column(Float, nullable=True)
    hourly_rate = Column(Float, nullable=True)  # for chatbot recommendations
    verification_status = Column(String(50), default="pending")
    profile_summary = Column(Text, nullable=True)
    qualification_text = Column(Text, nullable=True)
    experience_description = Column(Text, nullable=True)
    demo_transcript = Column(Text, nullable=True)
    id_document_path = Column(String(500), nullable=True)
    qualification_document_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="tutor_profile")

    @property
    def price(self):
        return self.hourly_rate


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_type = Column(String(100), nullable=False)  # home service type or "tutor"
    subject = Column(String(100), nullable=True)  # for tutor bookings
    total_price = Column(Float, nullable=False)
    commission_amount = Column(Float, nullable=False)
    provider_earning = Column(Float, nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("User", foreign_keys=[customer_id], back_populates="bookings_as_customer")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="bookings_as_provider")
    ratings = relationship("Rating", back_populates="booking", foreign_keys="Rating.booking_id")


class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    score = Column(Float, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="ratings")
    customer = relationship("User", foreign_keys=[customer_id], back_populates="ratings_given")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="ratings_received")


class AIDecisionLog(Base):
    __tablename__ = "ai_decision_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision_type = Column(String(100), nullable=False)  # identity_verification, tutor_evaluation
    raw_response = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_decision_logs")
