from fastapi import APIRouter
from fastapi.responses import JSONResponse
import platform
import sys

router = APIRouter()


@router.get("/health")
async def health_check():
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "service": "AI Resume NLP Microservice",
            "version": "1.0.0",
            "python": sys.version.split()[0],
            "platform": platform.system(),
        },
    )
