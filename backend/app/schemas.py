# ─────────────────────────────────────────────────────────────────────────────
# schemas.py — Pydantic request/response models (API data validation)
#
# Pydantic models are used by FastAPI to:
#   - Validate incoming request bodies (SystemCreate, AnalysisRequest)
#   - Serialize and document outgoing response bodies (SystemResponse,
#     AnalysisResponse, FileAnalysisResponse)
#
# Optional fields with defaults allow backward compatibility when older
# DB records lack newer enrichment columns.
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import List, Optional


# ── Request body when registering a new system ──
class SystemCreate(BaseModel):
    system_name: str
    description: str


# ── Response body returned after creating or fetching a system ──
class SystemResponse(BaseModel):
    id: int
    system_name: str
    description: str

    class Config:
        from_attributes = True  # allow building from SQLAlchemy ORM objects


# ── Request body for text-based threat analysis ──
class AnalysisRequest(BaseModel):
    system_description: str  # free-text description of the system to analyze


# ── Response body for a single identified threat ──
# Used by both text analysis and file analysis endpoints.
# Optional fields are None when not applicable (e.g. evidence is only
# present for file-based analyses).
class AnalysisResponse(BaseModel):
    threat: str
    category: str
    stride: Optional[str] = "Tampering"   # STRIDE category
    risk_level: str                        # Critical / High / Medium / Low
    likelihood: str
    impact: str
    risk_score: int                        # computed: likelihood_score * impact_score
    confidence: Optional[int] = None      # LLM confidence percentage (0–100)
    mitigation: str                        # one-line mitigation summary

    # Enrichment fields — added in v2
    why_flagged:         Optional[str]       = None   # explanation of why this threat was flagged
    attack_impact:       Optional[List[str]] = None   # list of potential consequences
    mitigation_steps:    Optional[List[str]] = None   # step-by-step remediation actions

    # File analysis fields — added in v3, absent for text-based analyses
    evidence:            Optional[str]  = None   # file excerpt that triggered the finding
    mitigation_priority: Optional[str]  = None   # Immediate / High / Moderate / Low
    source_filename:     Optional[str]  = None   # name of the uploaded file


# ── Response body for the file upload endpoint ──
# Wraps the list of threat findings with file metadata and pre-LLM hints
class FileAnalysisResponse(BaseModel):
    filename:    str              # original uploaded filename
    file_type:   str              # detected type (e.g. "YAML configuration")
    hints_found: int              # number of static-analysis hints found before LLM call
    hints:       List[str]        # list of raw hint strings from regex scanning
    analysis:    List[AnalysisResponse]  # full threat analysis results
