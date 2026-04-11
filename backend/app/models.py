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

    # ── New enrichment fields (nullable for backward compatibility) ──
    why_flagged     = Column(Text, nullable=True)
    attack_impact   = Column(Text, nullable=True)   # JSON-encoded list of strings
    mitigation_steps = Column(Text, nullable=True)  # JSON-encoded list of strings
