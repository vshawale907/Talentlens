# ─── Single-Stage Production Build ─────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV NLTK_DATA=/app/nltk_data

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install spaCy model
RUN pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz

# Create NLTK data directory and download data during build
RUN mkdir -p /app/nltk_data
RUN python -c "import nltk; nltk.download('punkt', download_dir='/app/nltk_data'); nltk.download('stopwords', download_dir='/app/nltk_data')"

# Copy application code
COPY . .

# Create logs directory and fix permissions
RUN mkdir -p logs && chmod 777 logs

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# Railway will ignore this and use railway.json config, but good for local sanity
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "main.py"]