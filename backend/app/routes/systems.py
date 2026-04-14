# ─────────────────────────────────────────────────────────────────────────────
# routes/systems.py — API routes for managing registered systems
#
# Base path: /systems
#
# Endpoints:
#   POST /systems/    — Register a new named system (name + description)
#   GET  /systems/    — Return all registered systems from the database
#
# These routes are used to store system metadata separately from analysis
# results, allowing users to re-analyze named systems without retyping
# their descriptions.
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/systems",
    tags=["Systems"]
)


# Create and persist a new system record in the database
@router.post("/", response_model=schemas.SystemResponse)
def create_system(system: schemas.SystemCreate, db: Session = Depends(get_db)):
    db_system = models.System(
        system_name=system.system_name,
        description=system.description
    )

    db.add(db_system)
    db.commit()
    db.refresh(db_system)  # reload from DB to get the auto-generated id

    return db_system


# Return all systems stored in the database
@router.get("/", response_model=list[schemas.SystemResponse])
def get_systems(db: Session = Depends(get_db)):
    systems = db.query(models.System).all()
    return systems