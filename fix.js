const fs = require('fs');
let content = fs.readFileSync('C:/Users/Rushikesh/.gemini/antigravity/tmp_openai.txt', 'utf8');

const lines = content.split('\n');

const newLines = lines.slice(0, 224);
newLines.push(
  '// ??? ATS + Quality Scoring ???????????????????????????????????????????????',
  '',
  'export interface ATSScoreResult {',
  '    atsScore: number;',
  '    qualityScore: number;',
  '    overallScore: number;',
  '    strengths: string[];',
  '    weaknesses: string[];',
  '    improvements: string[];',
  '    summary: string;',
  '    bulletImpactScores: { bullet: string; score: number; rewritten: string }[];',
  '}',
  '',
  'export const scoreResume = async (',
  '    resumeText: string,',
  '    nlpData: NLPAnalysisResult,',
  '    jobDescription?: string',
  '): Promise<ATSScoreResult> => {',
  '    const SYSTEM = You are an elite ATS (Applicant Tracking System) analyst and senior technical recruiter.',
  'Your task is to provide a PINPOINT ACCURATE, non-generic evaluation of a resume.',
  'You MUST return ONLY valid JSON matching the schema exactly. Do NOT add commentary outside JSON.',
  '',
  'STRICT SCORING RUBRIC (YOU MUST FOLLOW THIS):',
  '1. **Differentiator**: Do NOT give generic scores. Every resume is unique. If two resumes are different, their scores MUST reflect that. Average resumes score 45-55. Only world-class (top 1%) resumes score 90+.',
  '2. **atsScore** (0-100): ',
  '   - If JD provided: Start with Similarity Score (). Subtract 4 pts for every CRITICAL missing skill.',
  '   - If NO JD: Base on formatting, section headers, contact info presence, and logical flow. Max 75 if no JD.',
  '3. **qualityScore** (0-100): ',
  '   - Heavily weight the **Quantification Density** (%). If this is below 50%, qualityScore CANNOT exceed 65.',
  '   - Reward specific technologies used in context, not just listed.',
  '   - Penalize weak verbs (helped, assisted) and reward strong ones (architected, pioneered, reduced).',
  '4. **overallScore**: Math.round((atsScore * 0.4) + (qualityScore * 0.6)).',
  '',
  'Your summary and reasoning MUST reference at least TWO specific unique details/projects from the text to prove this isn\\'t a canned response.;',
  '',
  '    const USER = '
);
newLines.push(...lines.slice(245));
fs.writeFileSync('backend/src/services/openai.service.ts', newLines.join('\n'), 'utf8');
console.log('Fixed via full file replacement');
