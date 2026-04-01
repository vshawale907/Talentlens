from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from loguru import logger
import sys
import time

from app.routes import analyze, health
from app.core.nlp_engine import NLPEngine

# ─── Logging ──────────────────────────────────────────────────────────────
logger.remove()
logger.add(sys.stdout, format="{time:HH:mm:ss} | {level} | {message}", level="DEBUG")
logger.add("logs/ai_service_{time:YYYY-MM-DD}.log", rotation="1 day", retention="14 days", level="INFO")

# ─── Lifespan (startup / shutdown) ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI Microservice starting up...")
    # Load spaCy model and warm up TF-IDF on startup
    engine = NLPEngine.get_instance()
    logger.info(f"✅ spaCy model loaded: {engine.nlp.meta['name']}")
    yield
    logger.info("AI Microservice shutting down.")

# ─── FastAPI App ──────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Resume NLP Microservice",
    description="Custom NLP layer: skill extraction, TF-IDF similarity, keyword analysis",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://backend:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request timing middleware ────────────────────────────────────────────
@app.middleware("http")
async def add_process_time(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(duration)
    logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response

# ─── Routes ───────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, prefix="/analyze", tags=["Analysis"])

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting AI service on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
