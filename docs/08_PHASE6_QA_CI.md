# Phase 6: QA and CI Integration

Status: Complete.

## Scope

Phase 6 introduces automated quality gates for both frontend and backend:
- Frontend lint and production build checks
- Backend API smoke test suite
- GitHub Actions pipeline to enforce checks on push and pull request

## Backend Smoke Tests

Created:
- `backend/tests/test_api_smoke.py`

Covered endpoints:
- `GET /health`
- `GET /api/config`
- `GET /api/okr/structure`
- `GET /api/dependencies/kr/{source_kr_id}`
- `POST /api/dependencies`
- `GET /api/dependencies/kr/{source_kr_id}/progress`
- `DELETE /api/dependencies/{dependency_id}`
- `POST /api/capacity/rag`
- `POST /api/chat`

Purpose:
- Validate response status codes and key contract fields
- Catch major route regressions quickly

## Dependency Updates

Updated:
- `backend/requirements.txt`

Added packages:
- `pytest==8.3.2`
- `httpx==0.27.0`

## CI Pipeline

Created:
- `.github/workflows/continuous_integration.yaml`

### Frontend job
- Node 20
- `npm ci`
- `npm run lint`
- `npm run build`

### Backend job
- Python 3.11
- `pip install -r requirements.txt`
- `pytest -q`

Triggers:
- Push to `main` and `master`
- Push to `feature/**`
- Pull requests
- Manual dispatch (`workflow_dispatch`)

## Local Validation Commands

Frontend:
```bash
cd frontend
npm ci
npm run lint
npm run build
```

Backend:
```bash
cd backend
pip install -r requirements.txt
pytest -q
```

## Notes

- The backend smoke tests are intentionally contract-focused and fast.
- Deeper business-rule tests and E2E tests can be added in a later QA expansion pass.
