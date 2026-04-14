# ─────────────────────────────────────────────────────────────────────────────
# main.py — FastAPI application entry point for TARA
#
# Responsibilities:
#   - Creates the FastAPI app instance
#   - Runs SQLAlchemy table creation on startup (creates DB tables if missing)
#   - Registers CORS middleware so the React frontend can talk to the API
#   - Mounts all route modules (systems, analysis)
#   - Exposes a simple health-check endpoint at GET /
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import systems, analysis
from app.database import engine
from app.models import Base

app = FastAPI(title="TARA Threat Analyzer")

# Create all database tables defined in models.py if they don't already exist
Base.metadata.create_all(bind=engine)

# Allow requests from any origin — required for the local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules — each module handles its own URL prefix
app.include_router(systems.router)   # /systems/*
app.include_router(analysis.router)  # /analysis/*

# Health-check endpoint — useful for the frontend settings page status check
@app.get("/")
def home():
    return {"message": "TARA Threat Analyzer Running"}