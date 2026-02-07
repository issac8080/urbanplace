from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str  # customer, worker, tutor


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    trust_score: float
    created_at: datetime

    class Config:
        from_attributes = True


class WorkerProfileCreate(BaseModel):
    service_type: str
    # id_document uploaded separately


class WorkerProfileResponse(BaseModel):
    id: int
    user_id: int
    service_type: str
    verification_status: str
    rating: float
    price: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TutorProfileCreate(BaseModel):
    subject: str
    qualification_text: Optional[str] = None
    experience_description: Optional[str] = None
    demo_transcript: str
    # id_document, qualification_document uploaded separately


class TutorProfileResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    qualification_score: Optional[float] = None
    skill_score: Optional[float] = None
    verification_status: str
    profile_summary: Optional[str] = None
    price: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    provider_id: int
    service_type: str
    subject: Optional[str] = None  # for tutor
    total_price: float


class BookingResponse(BaseModel):
    id: int
    customer_id: int
    provider_id: int
    service_type: str
    subject: Optional[str] = None
    total_price: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str  # accepted, completed, cancelled


class RatingCreate(BaseModel):
    provider_id: int
    booking_id: Optional[int] = None
    score: float  # 1-5
    comment: Optional[str] = None


class ProviderSearchResult(BaseModel):
    id: int
    name: str
    email: str
    role: str
    trust_score: float
    service_type: Optional[str] = None
    subject: Optional[str] = None
    verification_status: str
    rating: Optional[float] = None
    qualification_score: Optional[float] = None
    skill_score: Optional[float] = None
    profile_summary: Optional[str] = None
    price: Optional[float] = None


Token.model_rebuild()
