# Phase 3 Deliverable - Postgres Schema & Seed Data

## Completed
- Added SQLAlchemy ORM models for Objective, KeyResult, Initiative, and Dependency domains.
- Added database connection management with configurable DATABASE_URL.
- Added seed data module to populate sample OKR structure on startup.
- Added startup event hook to initialize database tables and seed data.
- Added docker-compose.yml for easy local Postgres setup.
- Added setup_postgres.sh helper script for Docker-based Postgres.

## Database Setup for Local Development

### Option 1: Docker Compose (Recommended)
```bash
docker-compose up -d
```
This starts a Postgres container at `postgresql://postgres:postgres@localhost:5432/twinops_template`.

### Option 2: Docker CLI
```bash
bash setup_postgres.sh
```

### Database URL
The backend uses `DATABASE_URL` environment variable, defaulting to:
```
postgresql://postgres:postgres@localhost:5432/twinops_template
```

## Validation Run
- No syntax/type errors in database modules.
- Startup event will initialize tables and seed sample data on first run.

## User approval checklist
1. Start Postgres:
   - docker-compose up -d
   - Wait for Postgres to be ready (~2 seconds)

2. Update backend dependencies:
   - cd backend
   - source .venv/bin/activate
   - pip install -r requirements.txt

3. Verify table creation in Postgres:
   - psql postgresql://postgres:postgres@localhost:5432/twinops_template
   - \dt (should show objectives, key_results, initiatives, dependencies tables)
   - SELECT COUNT(*) FROM objectives; (should return 1)
   - SELECT COUNT(*) FROM key_results; (should return 1)
   - SELECT COUNT(*) FROM initiatives; (should return 1)
   - SELECT COUNT(*) FROM dependencies; (should return 2)

4. Restart backend with Postgres running:
   - cd backend
   - source .venv/bin/activate
   - uvicorn app.main:app --reload --port 8000

5. Verify endpoints respond correctly:
   - GET /api/okr/structure (should return seeded data)
   - GET /api/dependencies/kr/101 (should return seeded dependencies)

## Notes
- First start initializes the database and populates seed data.
- Subsequent starts skip seed if data already exists (idempotent).
- Models are defined via SQLAlchemy declarative base; migrations will be added in future phases.

## Post-Phase 3 Improvements (Deferred)
- Set up Alembic for schema versioning and migrations.
- Create database-backed service implementations (replace in-memory mocks).
- Add more comprehensive seed datasets.
