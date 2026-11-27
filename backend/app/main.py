from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .config import settings
from .routers import auth, api_router
from .database import engine, Base

# Auto create tables if not present
Base.metadata.create_all(bind=engine)

# Auto migrate schema for existing databases
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS note TEXT;"))
        conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS agent VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS level VARCHAR DEFAULT 'Junior';"))
        conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname VARCHAR;"))
        conn.commit()
except Exception:
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="CTSO Management System (CMS) Backend API"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api")
app.include_router(api_router.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected"
    }

@app.get("/")
def root():
    return {
        "message": "CTSO Management System (CMS) API is running. Access endpoints via /api/."
    }
