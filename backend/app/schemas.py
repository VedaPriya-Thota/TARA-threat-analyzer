from pydantic import BaseModel
from typing import List, Optional


# Request schema for creating system
class SystemCreate(BaseModel):
    system_name: str
    description: str


# Response schema for systems
class SystemResponse(BaseModel):
    id: int
    system_name: str
    description: str

    class Config:
        from_attributes = True


# Request schema for text analysis
class AnalysisRequest(BaseModel):
    system_description: str


# Response schema for a single threat (text or file analysis)
class AnalysisResponse(BaseModel):
    threat: str
    category: str
    stride: Optional[str] = "Tampering"
    risk_level: str
    likelihood: str
    impact: str
    risk_score: int
    confidence: Optional[int] = None
    mitigation: str

    # Enrichment — added in v2
    why_flagged:         Optional[str]       = None
    attack_impact:       Optional[List[str]] = None
    mitigation_steps:    Optional[List[str]] = None

    # File analysis — added in v3 (absent for text-based analyses)
    evidence:            Optional[str]  = None
    mitigation_priority: Optional[str]  = None
    source_filename:     Optional[str]  = None


# Response schema for file upload endpoint
class FileAnalysisResponse(BaseModel):
    filename:    str
    file_type:   str
    hints_found: int
    hints:       List[str]
    analysis:    List[AnalysisResponse]
