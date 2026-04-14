# ─────────────────────────────────────────────────────────────────────────────
# database.py — SQLAlchemy database connection setup
#
# Responsibilities:
#   - Loads the DATABASE_URL from the .env file (falls back to a local MySQL URL)
#   - Creates the SQLAlchemy engine (the low-level DB connection pool)
#   - Creates a SessionLocal factory used to open database sessions per request
#   - Defines the declarative Base class that all ORM models inherit from
#   - Provides get_db(), a FastAPI dependency that yields a DB session and
#     ensures it is closed after each request (even on error)
# ─────────────────────────────────────────────────────────────────────────────

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Read DB connection string from environment; fall back to local MySQL dev DB
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "your_db_url"
)

# Engine manages the connection pool to the database
engine = create_engine(DATABASE_URL)

# Session factory — autocommit and autoflush are off so we control transactions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all SQLAlchemy ORM models (imported in models.py)
Base = declarative_base()

def get_db():
    """
    FastAPI dependency — opens a DB session, yields it to the route handler,
    then closes it in the finally block regardless of success or error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
