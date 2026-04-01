# ─── Build Stage ─────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install to /install prefix
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# Install spaCy model to /install prefix
RUN pip install --prefix=/install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz

# Set PYTHONPATH to find packages in /install
ENV PYTHONPATH=/install/lib/python3.11/site-packages

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)"

# ─── Production Stage ─────────────────────────────────────
FROM python:3.11-slim AS production

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV NLTK_DATA=/root/nltk_data

# Install curl for healthcheck in production
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages + nltk data from builder
COPY --from=builder /install /usr/local
COPY --from=builder /root/nltk_data /root/nltk_data

COPY . .

# Create logs directory and fix permissions
RUN mkdir -p logs && chmod 777 logs

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]