from pydantic import BaseModel, field_validator
from typing import Optional


class AnalyzeRequest(BaseModel):
    resumeText: str
    jobDescriptionText: Optional[str] = None

    @field_validator("resumeText")
    @classmethod
    def validate_resume_text(cls, v: str) -> str:
        if len(v.strip()) < 50:
            raise ValueError("Resume text is too short (minimum 50 characters)")
        if len(v) > 100_000:
            raise ValueError("Resume text exceeds maximum length (100,000 characters)")
        return v.strip()

    @field_validator("jobDescriptionText")
    @classmethod
    def validate_jd(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 20_000:
            raise ValueError("Job description exceeds maximum length (20,000 characters)")
        return v.strip() if v else None


class AnalyzeResponse(BaseModel):
    extractedSkills: list[str]
    softSkills: list[str]
    experienceYears: int
    similarityScore: float
    matchedSkills: list[str]
    missingSkills: list[str]
    keywordDensity: dict[str, float]
    actionVerbs: list[str]
