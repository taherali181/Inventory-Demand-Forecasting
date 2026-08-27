# Build context is the repo root (see docker-compose.yml) so this can COPY
# both requirements.txt (root) and the backend/ package together.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 8000

# Applies pending Alembic migrations before every container start — cheap
# and idempotent when there's nothing new to apply (see backend/alembic/).
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]
