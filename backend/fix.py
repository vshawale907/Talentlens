import io
with io.open('src/services/openai.service.ts', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

new_lines = lines[:224]
replacement = '''// ─── ATS + Quality Scoring ───────────────────────────────────────────────

export interface ATSScoreResult {
    atsScore: number;
    qualityScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    summary: string;
    bulletImpactScores: { bullet: string; score: number; rewritten: string }[];
}

export const scoreResume = async (
    resumeText: string,
    nlpData: NLPAnalysisResult,
    jobDescription?: string
): Promise<ATSScoreResult> => {
    const SYSTEM = `You are an elite ATS (Applicant Tracking System) analyst and senior technical recruiter.
Your task is to provide a PINPOINT ACCURATE, non-generic evaluation of a resume.
You MUST return ONLY valid JSON matching the schema exactly. Do NOT add commentary outside JSON.

STRICT SCORING RUBRIC (YOU MUST FOLLOW THIS):
1. **Differentiator**: Do NOT give generic scores. Every resume is unique. If two resumes are different, their scores MUST reflect that. Average resumes score 45-55. Only world-class (top 1%) resumes score 90+.
2. **atsScore** (0-100): 
   - If JD provided: Start with Similarity Score (${nlpData.similarityScore}). Subtract 4 pts for every CRITICAL missing skill.
   - If NO JD: Base on formatting, section headers, contact info presence, and logical flow. Max 75 if no JD.
3. **qualityScore** (0-100): 
   - Heavily weight the **Quantification Density** (${nlpData.quantificationScore}%). If this is below 50%, qualityScore CANNOT exceed 65.
   - Reward specific technologies used in context, not just listed.
   - Penalize weak verbs (helped, assisted) and reward strong ones (architected, pioneered, reduced).
4. **overallScore**: Math.round((atsScore * 0.4) + (qualityScore * 0.6)).

Your summary and reasoning MUST reference at least TWO specific unique details/projects from the text to prove this isn't a canned response.`;

    const USER = `
## Resume Text
${sanitizeInput(resumeText)}

${jobDescription ? `## Target Job Description\\n${sanitizeInput(jobDescription)}` : ''}

## Pre-extracted NLP Data
- Tech Skills: ${nlpData.extractedSkills.join(', ')}
- Soft Skills: ${nlpData.softSkills.join(', ')}
- Experience Years: ${nlpData.experienceYears}
- Similarity Score (NLP): ${nlpData.similarityScore}
- Matched Skills: ${nlpData.matchedSkills.join(', ')}
- Missing Skills: ${nlpData.missingSkills.join(', ')}
- Quantification Density: ${nlpData.quantificationScore}%
- Total Achievement Bullets: ${nlpData.bulletCount}

## Task
Analyze this resume using the NLP data above. Return JSON:
{
  "atsScore": <0-100, strict ATS keyword match score>,
  "qualityScore": <0-100, strict writing/impact quality score>,
  "overallScore": <0-100, exactly Math.round((atsScore * 0.4) + (qualityScore * 0.6))>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["specific, actionable improvements"],
  "summary": "2-3 sentence executive summary of this resume",
  "bulletImpactScores": [
    { "bullet": "original bullet text", "score": <0-10>, "rewritten": "stronger quantified version based on XYZ formula" }
  ]
}`;

    return await callGPT<ATSScoreResult>(SYSTEM, USER, 3000);
};
'''
new_lines.append(replacement + '\n')
new_lines.extend(lines[277:])

with io.open('src/services/openai.service.ts', 'w', encoding='utf-8') as f:
    f.write(''.join(new_lines))

print("Fixed")
