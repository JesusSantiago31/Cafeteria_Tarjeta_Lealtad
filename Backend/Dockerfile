# Multi-stage production Dockerfile for FastAPI
FROM python:3.11-slim as builder

WORKDIR /app

# Prevent Python from writing .pyc files & buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final runtime image
FROM python:3.11-slim as runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

COPY --from=builder /install /usr/local
COPY . /app

EXPOSE 8000

# Run with Gunicorn Uvicorn workers
CMD exec gunicorn -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT} app.main:app
