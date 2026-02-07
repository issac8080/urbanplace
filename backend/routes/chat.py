"""
Chat API: POST /chat for AI conversational assistant.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from ai_chat_engine import chat_turn

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []


class RecommendedProvider(BaseModel):
    id: int
    name: str
    service_type: str
    rating: float
    trust_score: float
    price: float
    distance: float


class ChatResponse(BaseModel):
    reply: str
    recommended_providers: Optional[List[RecommendedProvider]] = None


def _history_to_messages(history: List[ChatMessage]) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in history]


def _is_urgent(message: str, history: List[ChatMessage]) -> bool:
    text = message.lower()
    for m in history:
        text += " " + (m.content or "").lower()
    return any(kw in text for kw in ("urgent", "asap", "emergency", "immediately", "right away"))


@router.post("", response_model=ChatResponse)
def post_chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
):
    """Process user message and return AI reply with optional provider recommendations."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="message is required")
    try:
        history = _history_to_messages(body.conversation_history)
        is_urgent = _is_urgent(body.message, body.conversation_history)
        result = chat_turn(db, body.message.strip(), history, is_urgent=is_urgent)
        providers = result.get("recommended_providers")
        out = ChatResponse(
            reply=result.get("reply", "I'm here to help. Could you describe what you need?"),
            recommended_providers=[RecommendedProvider(**p) for p in providers] if providers else None,
        )
        return out
    except ValueError as e:
        if "OPENAI_API_KEY" in str(e):
            raise HTTPException(status_code=503, detail="Chat is not configured. Set OPENAI_API_KEY.")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.exception("Chat failed")
        detail = str(e) or "Chat failed. Please try again."
        try:
            from openai import APIError, APIConnectionError, AuthenticationError
            if isinstance(e, (AuthenticationError, APIConnectionError)):
                detail = "Chat service unavailable. Check OPENAI_API_KEY and network."
            elif isinstance(e, APIError):
                detail = getattr(e, "message", None) or str(e) or "AI service error. Please try again."
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=detail)
