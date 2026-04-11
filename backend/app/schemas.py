from pydantic import BaseModel


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
    stride: str | None = "Tampering"
    risk_level: str
    likelihood: str
    impact: str
    risk_score: int
    confidence: int | None = None
    mitigation: str