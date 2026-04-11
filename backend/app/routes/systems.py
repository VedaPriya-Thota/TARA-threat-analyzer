from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/systems",
    tags=["Systems"]
)

# Create system
@router.post("/", response_model=schemas.SystemResponse)
def create_system(system: schemas.SystemCreate, db: Session = Depends(get_db)):
    db_system = models.System(
        system_name=system.system_name,
        description=system.description
    )

    db.add(db_system)
    db.commit()
    db.refresh(db_system)

    return db_system


# Get systems from database
@router.get("/", response_model=list[schemas.SystemResponse])
def get_systems(db: Session = Depends(get_db)):
    systems = db.query(models.System).all()
    return systems