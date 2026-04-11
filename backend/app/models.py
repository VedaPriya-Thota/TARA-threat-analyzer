from sqlalchemy import Column, Integer, String, Text
from app.database import Base


# Table: systems
class System(Base):
    __tablename__ = "systems"

    id = Column(Integer, primary_key=True, index=True)
    system_name = Column(String(255))
    description = Column(Text)


# Table: analysis_results
class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)

    system_description = Column(Text)

    threat = Column(String(255))
    category = Column(String(255))
    risk_level = Column(String(50))
    stride = Column(String(50))

    # Dynamic Scoring Fields
    likelihood = Column(String(50), default="Medium")
    impact = Column(String(50), default="Medium")
    risk_score = Column(Integer)
    confidence = Column(Integer, nullable=True)

    mitigation = Column(Text)

    # Enrichment fields (nullable for backward compatibility)
    why_flagged        = Column(Text, nullable=True)
    attack_impact      = Column(Text, nullable=True)   # JSON list
    mitigation_steps   = Column(Text, nullable=True)   # JSON list

    # File analysis fields (nullable — only present for file-upload analyses)
    evidence           = Column(Text, nullable=True)   # specific file excerpt
    source_filename    = Column(String(255), nullable=True)  # original uploaded filename
    mitigation_priority = Column(String(50), nullable=True)  # Immediate/High/Moderate/Low

    # URL analysis fields (nullable — only present for URL surface analyses)
    source_url         = Column(String(2048), nullable=True)  # analyzed URL
