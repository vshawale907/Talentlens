# ─── Build Stage ─────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)"

# ─── Production Stage ─────────────────────────────────────
FROM python:3.11-slim AS production

WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy spaCy + NLTK data
COPY --from=builder /root/nltk_data /root/nltk_data

COPY . .

# Ensure spaCy is explicitly downloaded in production stage (as requested)
RUN pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN mkdir -p logs && chown -R appuser:appgroup logs
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"
