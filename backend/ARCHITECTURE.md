# Backend Architecture Guide

This document describes the Domain-Driven Design (DDD) structure of the backend.

## Folder Structure

```
src/
├── domains/              ← Domain entry points (new, preferred import path)
│   ├── User/             → User model & auth  
│   ├── Resume/           → Resume upload, text extraction, S3
│   ├── Job/              → Job listings, keyword search
│   └── Matching/         → Vector embeddings, Qdrant semantic search
│
├── config/               ← Infrastructure config (singletons)
│   ├── database.ts       → MongoDB connection
│   ├── redis.ts          → Redis client + cache utilities
│   ├── s3.ts             → AWS S3 client (upload / delete / signed URLs)
│   ├── qdrant.ts         → Qdrant vector DB client + collection init
│   ├── env.ts            → Zod-validated environment variables
│   └── logger.ts         → Winston logger
│
├── models/               ← Mongoose schemas (keep here, re-exported via domains/)
│
├── services/             ← Business logic (keep here, re-exported via domains/)
│   ├── resume.service.ts → Multer + S3 upload + queue dispatch
│   ├── job.service.ts    → Keyword & semantic job search
│   ├── embedding.service.ts  → OpenAI / Gemini vector generation
│   ├── vectorSearch.service.ts → Qdrant upsert / search / delete
│   └── openai.service.ts → LLM calls (NLP extraction, scoring, chat)
│
├── jobs/                 ← BullMQ queue definitions
│   └── resumeQueue.ts    → Resume processing queue + enqueueResumeAnalysis()
│
├── workers/              ← Background job processors
│   └── resumeWorker.ts   → Runs NLP + AI + vector indexing outside HTTP lifecycle
│
├── routes/               ← Express router definitions (HTTP layer only)
├── middleware/           ← Auth, error handling, rate limiting
├── app.ts                ← Express app setup
└── server.ts             ← Bootstrap (DB, Redis, Qdrant init, start server)
```

## Domain Boundaries

| Domain | Responsible For | Key Services |
|---|---|---|
| **User** | Auth, profiles, subscriptions | `UserModel` |
| **Resume** | Upload, text extraction, S3, queue dispatch | `resumeService`, `upload` |
| **Job** | CRUD, keyword search, vector indexing on create | `jobService` |
| **Matching** | Semantic search, embedding generation | `findMatchingJobs`, `generateEmbedding` |

## Data Flow on Resume Upload

```
HTTP POST /api/v1/resumes/upload
    → multer saves to local temp disk
    → extractText() parses PDF/DOCX
    → uploaded to S3, local file deleted
    → MongoDB record created (status: processing)
    → BullMQ job enqueued
    → API returns 202 Accepted ✅ (instant response)

[Background Worker picks up job]
    → NLP service (Python) → fallback: LLM extraction
    → AI scoring (OpenAI / Gemini / Groq)
    → Analysis saved to MongoDB
    → Resume vector indexed in Qdrant
    → Redis cache updated
    → MongoDB status → 'analyzed' ✅
```

## Job Matching Flow

```
GET /api/v1/jobs/match/:resumeId
    → Check Redis cache (30 min TTL)
    → Fetch resume vector from Qdrant
    → Run cosine similarity search (score ≥ 0.55)
    → Filter: isActive === true
    → Fetch full job details from MongoDB
    → Return top 20 matches, sorted by score ✅
```

## Environment Variables Required

| Variable | Used For |
|---|---|
| `MONGO_URI` | MongoDB connection |
| `REDIS_URL` | Redis cache + BullMQ queue |
| `AWS_ACCESS_KEY_ID` | S3 file uploads |
| `AWS_SECRET_ACCESS_KEY` | S3 file uploads |
| `AWS_S3_BUCKET` | S3 bucket name |
| `QDRANT_URL` | Vector DB (default: http://localhost:6333) |
| `QDRANT_API_KEY` | Qdrant Cloud API key (optional) |
| `OPENAI_API_KEY` | Embeddings + AI scoring |
| `GEMINI_API_KEY` | AI fallback |
| `GROQ_API_KEY` | AI fallback |
