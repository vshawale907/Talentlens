# 🎯 TalentLens — AI-Powered Smart Resume Analyzer & Job Matcher

A **production-ready SaaS** built with a TypeScript/Node.js backend, Python FastAPI NLP microservice, and a React frontend. TalentLens gives job seekers deep resume analysis, semantic job matching, career coaching, and AI-driven content generation — powered by a **multi-provider AI fallback chain** (Gemini → Groq → OpenAI).

---

## ✨ Features

| Feature | Description |
|---|---|
| **ATS Scoring** | Rates resume against ATS systems (0–100) |
| **Quality Score** | Overall resume quality + writing style analysis |
| **Skill Extraction** | spaCy NER + curated 80+ skill dictionary |
| **Skill Gap Analysis** | Matched vs missing skills vs job description |
| **TF-IDF Similarity** | Cosine similarity between resume & JD |
| **Bullet Point Rewriter** | AI rewrites weak bullets with impact scores |
| **Interview Coach** | Behavioral / Technical / Situational questions |
| **Cover Letter Generator** | Role-tailored cover letter in seconds |
| **AI Chat Resume Coach** | Multi-turn career coaching (context-aware) |
| **Semantic Job Matcher** | Vector similarity search via Qdrant |
| **Career Roadmap** | AI-generated skill path for target roles |
| **Analytics Dashboard** | Recharts score history & upload trends |
| **Admin Dashboard** | User management, platform stats |
| **Stripe Subscriptions** | Free / Pro / Enterprise tiers |
| **Background Processing** | BullMQ job queue for async AI analysis |
| **Cloud File Storage** | AWS S3 / Cloudflare R2 / MinIO resume uploads |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Nginx (port 80)                      │
│   /          → React Frontend (SPA)                      │
│   /api/      → Node.js Backend (port 5000)               │
└──────────────────────────────────────────────────────────┘
              │                          │
    ┌─────────────────┐    ┌──────────────────────────┐
    │  Node.js Backend│    │   Python FastAPI (:8000)  │
    │  Express + TS   │───▶│   spaCy + TF-IDF NLP     │
    │  Mongoose + JWT │    │   Skill Extraction        │
    │  BullMQ Workers │    │   Cosine Similarity       │
    │  AWS S3 Uploads │    └──────────────────────────┘
    └────────┬────────┘
             │
    ┌────────┴───────────────────────┐
    │  MongoDB  │  Redis  │  Qdrant  │
    │  (data)   │  (cache │  (vector │
    │           │  queue) │  search) │
    └────────────────────────────────┘
```

**AI Provider Fallback Chain:**
```
Gemini 2.0 Flash → Gemini 1.5 Flash/Pro → Groq (Llama-3.3-70B) → OpenAI GPT-4o
```
Any provider that is unavailable, rate-limited, or returns an error is automatically skipped.

**Data Flow:**
1. User uploads PDF/DOCX → file stored in **AWS S3**; text extracted by `pdf-parse` / `mammoth`
2. Resume analysis job is **enqueued via BullMQ** (Redis-backed queue)
3. Background **Worker** picks up the job: calls Python NLP service → AI scoring → stores result in MongoDB
4. Worker **indexes resume vector** in Qdrant for semantic job matching
5. All results cached in Redis; React frontend renders interactive charts and skill badges

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/yourname/talentlens.git
cd talentlens

# 2. Copy and fill environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — add at least one AI key + Mongo URI

# 3. Start all services
docker-compose up --build

# App is live at http://localhost
```

---

## 💻 Local Development

### Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env   # fill in values
npm run dev            # starts on port 5000
```

### Python AI Service

```bash
# 1. Navigate to the directory
cd ai-service

# 2. Create the virtual environment
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Download the Spacy model directly (the corrected command)
python -m pip install "https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz"

# 6. Start the FastAPI server
uvicorn main:app --reload --port 8000

```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev    # starts on port 3000 (proxies /api → localhost:5000)
```

> **Note:** You need at least one AI API key (Gemini, Groq, or OpenAI) set in `backend/.env` for AI features to work. The service will automatically try them in order.

---

## 📁 Project Structure

```
talentlens/
├── docker-compose.yml
├── nginx.conf
│
├── backend/                        # Node.js / TypeScript
│   └── src/
│       ├── app.ts                  # Express app + middleware
│       ├── server.ts               # Entry point + graceful shutdown
│       ├── config/
│       │   ├── env.ts              # Zod-validated env config
│       │   ├── database.ts         # MongoDB connection
│       │   ├── redis.ts            # ioredis cache client
│       │   ├── qdrant.ts           # Qdrant vector DB client
│       │   ├── s3.ts               # AWS S3 / R2 / MinIO client
│       │   └── logger.ts           # Winston logger
│       ├── domains/                # Domain-driven design
│       │   ├── Job/
│       │   ├── Resume/
│       │   ├── Matching/           # Barrel export: vector search + embeddings
│       │   └── User/
│       ├── jobs/
│       │   └── resumeQueue.ts      # BullMQ queue definition
│       ├── workers/
│       │   └── resumeWorker.ts     # Background AI processing worker
│       ├── middleware/             # auth, rateLimiter, errorHandler, apiResponse
│       ├── models/                 # User, Resume, Analysis, Job, ChatSession
│       ├── routes/                 # auth, resume, analysis, jobs, chat, admin, subscription, user
│       └── services/
│           ├── auth.service.ts
│           ├── resume.service.ts
│           ├── openai.service.ts   # Multi-provider AI (Gemini → Groq → OpenAI)
│           ├── embedding.service.ts# OpenAI / Gemini embeddings for vector search
│           ├── vectorSearch.service.ts # Qdrant: index + similarity search
│           ├── nlp.client.ts       # Python NLP microservice client
│           └── job.service.ts
│
├── ai-service/                     # Python / FastAPI
│   ├── main.py                     # FastAPI app with lifespan
│   ├── app/
│   │   ├── core/nlp_engine.py      # spaCy + TF-IDF + skill extraction
│   │   ├── routes/analyze.py       # POST /analyze
│   │   ├── routes/health.py        # GET /health
│   │   └── schemas/                # Pydantic request/response models
│   └── requirements.txt
│
└── frontend/                       # React 18 / Vite / TypeScript
    └── src/
        ├── App.tsx                  # Router (ProtectedRoute, AdminRoute)
        ├── main.tsx                 # Entry + React Query provider
        ├── components/
        │   └── Layout.tsx           # Sidebar navigation + animated shell
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx    # Score history charts (Recharts)
        │   ├── UploadPage.tsx       # Drag-and-drop upload + live progress
        │   ├── AnalysisPage.tsx     # Full analysis report
        │   ├── JobMatcherPage.tsx   # Semantic job search results
        │   ├── InterviewCoachPage.tsx
        │   ├── CoverLetterPage.tsx
        │   ├── ChatCoachPage.tsx    # Multi-turn AI career coach
        │   └── AdminPage.tsx
        ├── stores/
        │   ├── authStore.ts         # Zustand (persisted JWT)
        │   └── resumeStore.ts       # Zustand (resume + analysis state)
        └── lib/
            └── api.ts               # Axios client + typed API helpers
```

---

## 🗄️ Core Database Schemas & Models
To understand the data flow, here are the core MongoDB models defining the backend structure:

### User Model (`User.model.ts`)
- **Roles:** `user`, `recruiter`, `admin`
- **Tiers:** `free`, `pro`, `enterprise`
- **Key Fields:** `email`, `password` (bcrypt), `isActive`, `theme` (light/dark), usage counters (`resumeCount`, `analysisCount`), `stripeCustomerId`, `stripeSubscriptionId`.

### Resume Model (`Resume.model.ts`)
- **Status:** `uploading`, `processing`, `analyzed`, `error`
- **Key Fields:** `title`, `originalFilename`, `fileType` (pdf/docx), `fileKey`, `s3Url`, `rawText`, `cleanedText`, `tags`, `isOptimized`.

### Analysis Model (`Analysis.model.ts`)
Composed of two heavy sub-documents depending on the analysis stage:
- **NLP Result (From Python Service):** `extractedSkills`, `softSkills`, `experienceYears`, `similarityScore`, `matchedSkills`, `missingSkills`, `keywordDensity`.
- **OpenAI Result (From AI Fallback Chain):** `atsScore`, `qualityScore`, `overallScore`, `strengths`, `weaknesses`, `improvements`, Array of `bulletImpactScores` (original vs. rewritten), `interviewQuestions`, `coverLetter`, `careerRoadmap`.

### Job Model (`Job.model.ts`)
- **Key Fields:** `title`, `company`, `type`, `experienceLevel`, `requirements`, `preferredSkills`, `salaryMin/Max`, `embedding` (Array of numbers for Qdrant vector search).

### ChatSession Model (`ChatSession.model.ts`)
- **Key Fields:** Array of `messages` (`role`: user/assistant, `content`, `timestamp`), `totalTokensUsed`, reference to `resume`.

---

## 🧠 AI System Prompts & Coaching Modes
The system uses highly tuned system prompts across the fallback chain. The `openai.service.ts` coordinates these capabilities securely, heavily guarding against Prompt Injection (`ignore previous instructions`, `DAN`, etc.).

1. **NLP Fallback Extraction:** Extracts tech/soft skills, experience years, and calculates JD similarity (0-100).
2. **ATS + Quality Scoring:** Uses existing NLP data to score resume against ATS, identifies weaknesses, and rewrites bullet points.
3. **Interview Question Generator:** Generates 15 personalized questions (5 Behavioral, 5 Technical, 5 Situational) alongside difficulty and hints.
4. **Cover Letter Generator:** Personalizes cover letters dynamically using candidate history and job descriptions.
5. **Career Roadmap:** Generates short/medium/long-term goals and required learning.
6. **Structured AI Chat Coach:** Features precise coaching modes overriding standard chat:
   - `general`: Practical career advice.
   - `resume_review`: ATS optimization specialist.
   - `skill_gap`: Technical assessment and learning roadmap.
   - `interview_prep`: Targeted practice and frameworks.
   - `career_guidance`: Mentorship and milestones.
   - `bullet_rewrite`: Metrics-driven STAR/XYZ method rewriting.
   - `interview_sim`: Mock technical interviewer.

All outputs enforce strict JSON structures fallback mechanisms ensuring 99.9% uptime.

---

## 🎨 UI Theme & Frontend State Management

### Brand Kit & Aesthetics
- The application features a **Premium Black & Gold Redesign**.
- It uses a sleek SaaS-like aesthetic with dark modes, using minimal gold/amber color highlights for a luxurious, modern feel.
- Uses **Tailwind CSS** heavily for styling.
- Interactive micro-animations via **Framer Motion**.
- Data visualization built with **Recharts**.

### State Management (`Zustand`)
- **`authStore`**: Persists user session, JWT tokens (`accessToken`, `refreshToken`), and user profile data (including theme preferences).
- **`resumeStore`**: Manages the list of uploaded resumes, the currently selected resume, analysis results (`nlpResult`, `openAIResult`), and loading states (`isAnalyzing`, `isUploading`). Keeps the UI perfectly synced with the backend BullMQ job ticks.

---

## 🔧 Environment Variables

### `backend/.env`

```env
# ── Core ─────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ──────────────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/talentlens
REDIS_URL=redis://localhost:6379

# ── Auth ──────────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── AI Providers (at least one required) ──────────────────
GEMINI_API_KEY=AIza...          # Google Gemini (primary)
GROQ_API_KEY=gsk_...            # Groq / Llama-3.3 (first fallback)
OPENAI_API_KEY=sk-...           # OpenAI GPT-4o (last fallback)
OPENAI_MODEL=gpt-4o

# ── Python NLP Microservice ────────────────────────────────
AI_SERVICE_URL=http://localhost:8000

# ── Vector Search ─────────────────────────────────────────
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=                 # Optional for local Qdrant

# ── File Storage (AWS S3 / Cloudflare R2 / MinIO) ─────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=talentlens-resumes
AWS_S3_ENDPOINT=                # Set for R2/MinIO: https://xxx.r2.cloudflarestorage.com

# ── Stripe ────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# ── App ───────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@talentlens.com
LOG_LEVEL=debug

# ── Dev Bypass (optional) ─────────────────────────────────
MOCK_AI=false   # Set to true to skip real AI calls during UI development
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login + get JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/profile` | Update profile |

### Resumes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/resumes/upload` | Upload PDF/DOCX (stored in S3) |
| POST | `/api/v1/resumes/:id/analyze` | Enqueue NLP + AI analysis job |
| GET | `/api/v1/resumes` | List user resumes |
| DELETE | `/api/v1/resumes/:id` | Delete resume + remove vector |

### Analysis
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/analysis/:resumeId/latest` | Latest analysis result |
| POST | `/api/v1/analysis/:resumeId/interview-questions` | Generate interview questions |
| POST | `/api/v1/analysis/:resumeId/cover-letter` | Generate cover letter |
| POST | `/api/v1/analysis/:resumeId/roadmap` | Generate career roadmap |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/jobs` | List / search jobs |
| GET | `/api/v1/jobs/match/:resumeId` | Semantic vector job matching |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/chat/message` | Send message to AI coach |
| GET | `/api/v1/chat/history` | Retrieve conversation history |

### Python NLP Service
| Method | Endpoint | Description |
|---|---|---|
| POST | `http://localhost:8000/analyze` | Run NLP pipeline |
| GET | `http://localhost:8000/health` | Health check |

---

## 🛡 Security

- **JWT** access tokens (7d) + refresh tokens (30d)
- **bcrypt** password hashing (saltRounds=12)
- **Helmet** security headers
- **Rate limiting** per endpoint category (auth: 5/15min, upload: 10/hr)
- **Zod** input validation on all routes
- **XSS / Prompt injection protection** on all AI inputs (`sanitizeInput`)
- **Non-root Docker users** in all containers
- **S3 pre-signed URLs** for secure file access (no direct bucket exposure)

---

## 🧠 AI & Vector Search Details

### Multi-Provider Fallback
The `openai.service.ts` module implements a robust **Gemini → Groq → OpenAI** fallback chain. It:
- Tries multiple model versions per provider (e.g., `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-pro`)
- Differentiates between rate limits (temporary — retry) and quota/auth errors (permanent — skip provider)
- Supports a `MOCK_AI=true` env flag for offline UI development

### Semantic Job Matching (Qdrant)
- Resumes and job postings are embedded using **OpenAI `text-embedding-3-small`** (1536 dims), with a **Gemini `text-embedding-004`** fallback (768 dims, zero-padded to 1536)
- Vectors are stored in **Qdrant** collections (`resumes` and `jobs`)
- Job matching uses cosine similarity with a configurable score threshold (default: 0.55)

### Background Processing (BullMQ)
- Resume analysis is **fully asynchronous** — the upload endpoint immediately returns a job ID
- The `resumeWorker.ts` processes jobs with **concurrency=5** and a global rate limiter (10 jobs/10s)
- Automatic retry with **exponential backoff** (3 attempts: 5s, 10s, 20s)
- Failed jobs are preserved in Redis for 24h for debugging

---

## 🚢 Deployment

### Docker (All-in-One)
```bash
docker-compose up --build
```

### Railway / Render (Cloud)
1. Create separate services for `backend`, `ai-service`, `frontend`
2. Add MongoDB Atlas + Redis Cloud + Qdrant Cloud connection strings
3. Set all environment variables from `backend/.env.example`

### Vercel (Frontend Only)
```bash
cd frontend && npx vercel --prod
# Set VITE_API_URL env var to your backend URL
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS 3, Framer Motion, Recharts, Zustand, React Query |
| **Backend** | Node.js 20, Express, TypeScript, Mongoose, BullMQ, Winston |
| **AI/NLP** | Python FastAPI, spaCy, scikit-learn (TF-IDF), sentence-transformers |
| **LLM** | Google Gemini 2.0 Flash, Groq (Llama-3.3-70B), OpenAI GPT-4o (fallback chain) |
| **Vector Search** | Qdrant (cosine similarity, 1536-dim embeddings) |
| **Auth** | JWT (jsonwebtoken), bcrypt |
| **Job Queue** | BullMQ (Redis-backed async processing) |
| **File Storage** | AWS S3 / Cloudflare R2 / MinIO |
| **Cache** | Redis (ioredis) |
| **Payments** | Stripe |
| **Database** | MongoDB, Redis, Qdrant |
| **Infrastructure** | Docker, Docker Compose, Nginx |

---

## 📄 License

MIT © 2026 TalentLens
