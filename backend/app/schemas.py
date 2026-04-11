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


# Request schema for analysis
class AnalysisRequest(BaseModel):
    system_description: str


# Response schema for threat analysis
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

    # Enrichment fields — optional for backward compatibility
    why_flagged:      Optional[str]       = None
    attack_impact:    Optional[List[str]] = None
    mitigation_steps: Optional[List[str]] = None
