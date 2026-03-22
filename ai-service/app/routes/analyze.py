from fastapi import APIRouter, HTTPException
from loguru import logger

from app.schemas.analyze_schema import AnalyzeRequest, AnalyzeResponse
from app.core.nlp_engine import NLPEngine

router = APIRouter()


@router.post("", response_model=AnalyzeResponse)
async def analyze_resume(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyze a resume using custom NLP pipeline.
    
    Steps:
    1. Text cleaning + normalization
    2. Skill extraction (tech + soft) from curated dictionaries
    3. Experience year detection (regex + date range parsing)
    4. Action verb detection
    5. Keyword density (top-20 TF-weighted tokens)
    6. TF-IDF cosine similarity vs job description (if provided)
    7. Skill gap analysis: matched vs missing skills
    
    Returns structured JSON used by OpenAI layer for reasoning.
    """
    try:
        engine = NLPEngine.get_instance()
        result = engine.analyze(
            resume_text=payload.resumeText,
            job_description=payload.jobDescriptionText,
        )
        logger.info(
            f"Analysis complete | skills={len(result['extractedSkills'])} "
            f"| similarity={result['similarityScore']}%"
        )
        return AnalyzeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"NLP analysis failed: {str(e)}")
