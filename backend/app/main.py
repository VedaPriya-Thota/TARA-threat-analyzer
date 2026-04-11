# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# from app.routes import systems, analysis

# app = FastAPI(title="TARA Threat Analyzer")   # ✅ THIS MUST EXIST

# # CORS
# origins = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Routers
# app.include_router(systems.router)
# app.include_router(analysis.router)

# @app.get("/")
# def home():
#     return {"message": "TARA Threat Analyzer Running"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import systems, analysis
from app.database import engine
from app.models import Base

app = FastAPI(title="TARA Threat Analyzer")

# 🔥 CREATE TABLES
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(systems.router)
app.include_router(analysis.router)

@app.get("/")
def home():
    return {"message": "TARA Threat Analyzer Running"}