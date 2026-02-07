"""
AI Engine module for identity verification, tutor evaluation, and trust scoring.
All AI logic runs from backend using OpenAI API.
"""
import json
import os
from typing import Optional
from config import get_settings

settings = get_settings()
_client = None

IDENTITY_VERIFICATION_THRESHOLD = 0.7  # 70% confidence to approve
QUALIFICATION_MIN_SCORE = 60
SKILL_MIN_SCORE = 60


def _get_client():
    """Lazy-initialize OpenAI client to avoid import-time errors and proxy compatibility issues."""
    global _client
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set. AI features are disabled.")
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def _ensure_client():
    return _get_client()


def verify_identity(has_id_document: bool, document_path: Optional[str] = None) -> dict:
    """
    Simulate AI identity verification.
    Validates presence of ID document and generates confidence evaluation.
    Returns: { "approved": bool, "confidence": float, "reason": str }
    """
    client = _ensure_client()
    prompt = f"""You are an AI identity verification agent. Evaluate the following:
- ID document provided: {has_id_document}
- Document path (for context): {document_path or 'N/A'}

Return ONLY valid JSON with exactly these keys (no markdown, no extra text):
{{
  "confidence": <float 0.0 to 1.0>,
  "approved": <true if confidence >= 0.7 else false>,
  "reason": "<short one-line explanation>"
}}"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        confidence = float(data.get("confidence", 0.0))
        approved = confidence >= IDENTITY_VERIFICATION_THRESHOLD if "approved" not in data else data["approved"]
        return {
            "approved": bool(approved),
            "confidence": confidence,
            "reason": data.get("reason", ""),
            "raw_response": response.choices[0].message.content,
        }
    except Exception as e:
        return {
            "approved": False,
            "confidence": 0.0,
            "reason": f"AI verification failed: {str(e)}",
            "raw_response": str(e),
        }


def evaluate_tutor(
    qualification_text: str,
    experience_description: str,
    demo_transcript: str,
) -> dict:
    """
    Send structured prompt to OpenAI for tutor evaluation.
    Returns structured result: qualification_score, skill_score, approval, reason, profile_summary.
    """
    client = _ensure_client()
    prompt = f"""You are an AI tutor evaluation agent. Evaluate this tutor application.

QUALIFICATION TEXT:
{qualification_text or "Not provided"}

EXPERIENCE DESCRIPTION:
{experience_description or "Not provided"}

DEMO TEACHING TRANSCRIPT:
{demo_transcript or "Not provided"}

Return ONLY valid JSON with exactly these keys (no markdown, no extra text):
{{
  "qualification_score": <integer 0-100>,
  "skill_score": <integer 0-100>,
  "approval": <true if both scores >= 60 else false>,
  "reason": "<short one-line explanation>",
  "profile_summary": "<2-3 sentences for users, summarizing the tutor's strengths>"
}}

Rules: qualification_score < 60 or skill_score < 60 must result in approval: false."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        q_score = int(data.get("qualification_score", 0))
        s_score = int(data.get("skill_score", 0))
        approval = (
            q_score >= QUALIFICATION_MIN_SCORE and s_score >= SKILL_MIN_SCORE
            if "approval" not in data
            else data["approval"]
        )
        return {
            "qualification_score": q_score,
            "skill_score": s_score,
            "approval": bool(approval),
            "reason": data.get("reason", ""),
            "profile_summary": data.get("profile_summary", ""),
            "raw_response": response.choices[0].message.content,
        }
    except Exception as e:
        return {
            "qualification_score": 0,
            "skill_score": 0,
            "approval": False,
            "reason": f"AI evaluation failed: {str(e)}",
            "profile_summary": "",
            "raw_response": str(e),
        }


def compute_trust_score(
    ai_approved: bool,
    completion_rate: float,
    cancellation_rate: float,
    avg_rating: float,
) -> float:
    """
    Compute dynamic trust score (0-100) from:
    - AI evaluation result
    - Booking completion rate (0-1)
    - Cancellation rate (0-1)
    - Average rating (1-5)
    """
    base = 40.0 if ai_approved else 0.0
    completion_bonus = completion_rate * 25.0  # up to 25
    cancellation_penalty = cancellation_rate * 20.0  # up to -20
    rating_score = ((avg_rating - 1) / 4) * 35.0 if avg_rating else 0  # 1-5 -> 0-35
    score = base + completion_bonus - cancellation_penalty + rating_score
    return max(0.0, min(100.0, round(score, 1)))
