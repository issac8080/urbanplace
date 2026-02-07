"""
AI Chat Engine: conversational assistant that understands problems,
asks follow-ups, determines service category, and recommends providers from the database.
Uses OpenAI with function-calling to call get_providers_by_service(service_type).
"""
import json
import random
from typing import Any, Optional

from sqlalchemy.orm import Session
from openai import OpenAI

from config import get_settings
from models import User, WorkerProfile, TutorProfile, HOME_SERVICE_TYPES, TUTOR_SUBJECTS

settings = get_settings()
_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set. Chat is disabled.")
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


SYSTEM_PROMPT = """You are an intelligent home services assistant for the Urban platform.
Your job is to:
1. Understand the user's problem in natural language.
2. Ask clarifying questions if the required service is unclear (e.g. "Is it leaking, blocked, or completely broken?" for plumbing).
3. Determine the correct service category (e.g. plumber, electrician, cleaning, painting, gardening, or tutor subjects: mathematics, coding, language).
4. When you have enough information, call the get_providers_by_service function with the exact service_type (lowercase, e.g. plumber, electrician, mathematics).
5. After receiving provider results, respond conversationally with a short message and mention you're showing recommended providers. Keep responses concise.

Service mapping:
- Plumbing, pipe, leak, sink, toilet, drain -> plumber
- Electrical, wiring, fuse, lights -> electrician
- Cleaning, housekeeping, deep clean -> cleaning
- Painting, walls, interior -> painting
- Garden, lawn, plants -> gardening
- Math, mathematics -> mathematics
- Coding, programming -> coding
- Language, English, Hindi, etc. -> language

If the user says they need something urgent, we will prioritize highest-rated providers (already done by the system).
If no providers are found for a category, apologize and suggest trying again later.
Always respond in a friendly, helpful, concise way. When recommending, briefly introduce the list then rely on the structured data shown to the user."""


def get_providers_by_service(db: Session, service_type: str, limit: int = 3, prefer_rating: bool = False) -> list[dict]:
    """
    Query approved providers by service_type (home service) or subject (tutor).
    Returns list of dicts: name, service_type, rating, trust_score, price, distance (mocked).
    """
    service_type = (service_type or "").strip().lower().replace(" ", "_")
    results = []

    if service_type in HOME_SERVICE_TYPES:
        q = (
            db.query(User, WorkerProfile)
            .join(WorkerProfile, User.id == WorkerProfile.user_id)
            .filter(
                WorkerProfile.service_type == service_type,
                WorkerProfile.verification_status == "approved",
            )
        )
        if prefer_rating:
            q = q.order_by(WorkerProfile.rating.desc(), User.trust_score.desc())
        else:
            q = q.order_by(User.trust_score.desc(), WorkerProfile.rating.desc())
        rows = q.limit(limit).all()
        for user, profile in rows:
            price = profile.hourly_rate if profile.hourly_rate is not None else round(random.uniform(200, 1500), 0)
            rating = (profile.rating if profile.rating is not None else 0) or 0
            trust = (user.trust_score if user.trust_score is not None else 0) or 0
            results.append({
                "id": user.id,
                "name": user.name,
                "service_type": profile.service_type,
                "rating": round(float(rating), 1),
                "trust_score": round(float(trust), 1),
                "price": float(price),
                "distance": round(random.uniform(1.0, 12.0), 1),
            })
    elif service_type in TUTOR_SUBJECTS:
        q = (
            db.query(User, TutorProfile)
            .join(TutorProfile, User.id == TutorProfile.user_id)
            .filter(
                TutorProfile.subject == service_type,
                TutorProfile.verification_status == "approved",
            )
        )
        # Tutor "rating" from (qualification_score + skill_score) / 40 -> roughly 3.5-5
        if prefer_rating:
            q = q.order_by(
                (TutorProfile.qualification_score + TutorProfile.skill_score).desc(),
                User.trust_score.desc(),
            )
        else:
            q = q.order_by(User.trust_score.desc())
        rows = q.limit(limit).all()
        for user, profile in rows:
            qs = profile.qualification_score or 70
            ss = profile.skill_score or 70
            rating = round((qs + ss) / 40.0, 1)
            rating = max(3.5, min(5.0, rating))
            price = profile.hourly_rate if profile.hourly_rate is not None else round(random.uniform(300, 2000), 0)
            trust = (user.trust_score if user.trust_score is not None else 0) or 0
            results.append({
                "id": user.id,
                "name": user.name,
                "service_type": profile.subject,
                "rating": rating,
                "trust_score": round(float(trust), 1),
                "price": float(price),
                "distance": round(random.uniform(1.0, 12.0), 1),
            })
    return results


def chat_turn(
    db: Session,
    message: str,
    conversation_history: list[dict],
    is_urgent: bool = False,
) -> dict:
    """
    Process one user message and return { "reply": str, "recommended_providers": list or None }.
    Uses OpenAI with function calling; when the model calls get_providers_by_service, we execute it and continue.
    """
    client = _get_client()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *conversation_history,
        {"role": "user", "content": message},
    ]

    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_providers_by_service",
                "description": "Fetch approved providers for a given service type. Call this when you have determined the user's required service (e.g. plumber, electrician, cleaning, mathematics, coding).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "service_type": {
                            "type": "string",
                            "description": "Exact service type: one of plumber, electrician, cleaning, painting, gardening, mathematics, coding, language, etc.",
                        },
                    },
                    "required": ["service_type"],
                },
            },
        },
    ]

    recommended_providers: Optional[list[dict]] = None
    max_rounds = 5
    round_ = 0

    while round_ < max_rounds:
        round_ += 1
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0.4,
        )
        choice = response.choices[0]
        msg = choice.message
        if msg.content:
            messages.append({"role": "assistant", "content": msg.content})
        if not getattr(msg, "tool_calls", None) or len(msg.tool_calls) == 0:
            reply = (msg.content or "").strip()
            return {"reply": reply or "I'm here to help. Could you describe what you need?", "recommended_providers": recommended_providers}

        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in msg.tool_calls
            ],
        })
        for tc in msg.tool_calls:
            if tc.function.name != "get_providers_by_service":
                continue
            try:
                args = json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments
                st = args.get("service_type", "")
                recommended_providers = get_providers_by_service(db, st, limit=3, prefer_rating=is_urgent)
                result = json.dumps({"providers": recommended_providers, "count": len(recommended_providers)})
            except Exception as e:
                result = json.dumps({"error": str(e), "providers": []})
                recommended_providers = None
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

    # Fallback: last assistant content if any
    last_content = ""
    for m in reversed(messages):
        if m.get("role") == "assistant" and m.get("content"):
            last_content = m["content"]
            break
    return {"reply": last_content or "Something went wrong. Please try again.", "recommended_providers": recommended_providers}
