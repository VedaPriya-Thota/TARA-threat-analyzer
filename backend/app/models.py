# ─────────────────────────────────────────────────────────────────────────────
# models.py — SQLAlchemy ORM models (database table definitions)
#
# Defines two tables:
#   - System            : stores named systems registered by the user
#   - AnalysisResult    : stores every individual threat produced by any
#                         analysis (text, file upload, or URL), one row per threat
#
# All columns are mapped directly to database columns via SQLAlchemy.
# Nullable fields were added in later versions and remain optional so that
# old records without them continue to load without errors.
# ─────────────────────────────────────────────────────────────────────────────

from sqlalchemy import Column, Integer, String, Text
from app.database import Base


# Stores user-registered systems (name + description)
class System(Base):
    __tablename__ = "systems"

    id = Column(Integer, primary_key=True, index=True)
    system_name = Column(String(255))
    description = Column(Text)


# Stores every threat identified across all analysis sessions.
# One row = one threat. Multiple rows share the same system_description
# when they come from the same analysis run.
class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)

    # The original user input (text description, file label, or URL label)
    system_description = Column(Text)

    # Core threat fields returned by the LLM
    threat = Column(String(255))
    category = Column(String(255))
    risk_level = Column(String(50))
    stride = Column(String(50))           # STRIDE category assigned to this threat

    # Risk scoring inputs and computed result
    likelihood = Column(String(50), default="Medium")   # High / Medium / Low
    impact = Column(String(50), default="Medium")       # High / Medium / Low
    risk_score = Column(Integer)                        # likelihood_score * impact_score
    confidence = Column(Integer, nullable=True)         # LLM confidence 0–100

    mitigation = Column(Text)  # One-line mitigation summary

    # Enrichment fields added in v2 — store why this threat was flagged
    # and structured attack/mitigation details as JSON strings
    why_flagged        = Column(Text, nullable=True)
    attack_impact      = Column(Text, nullable=True)   # JSON list of attack consequences
    mitigation_steps   = Column(Text, nullable=True)   # JSON list of implementation steps

    # File analysis fields — only populated when input came from an uploaded file
    evidence           = Column(Text, nullable=True)          # excerpt from file that triggered the threat
    source_filename    = Column(String(255), nullable=True)   # original uploaded filename
    mitigation_priority = Column(String(50), nullable=True)   # Immediate / High / Moderate / Low

    # URL analysis fields — only populated when input came from a URL scan
    source_url         = Column(String(2048), nullable=True)  # the URL that was analyzed
