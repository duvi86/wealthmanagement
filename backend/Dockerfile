# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install only production dependencies
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --target /app/deps -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /app/deps /app/deps
ENV PYTHONPATH=/app/deps

# Copy application source
COPY . .

RUN chmod +x render-start.sh

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["bash", "render-start.sh"]
