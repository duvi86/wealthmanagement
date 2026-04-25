# Deployment Workflow

Status: Active.

## Overview

This repository uses a Dash-inspired CD setup:

1. `.github/workflows/continuous_deployment.yaml`
2. `.github/actions/deploy-to-azure-webapp/action.yaml`

The workflow:
1. Deploys to `dev`, `uat`, and `prod` GitHub Environments.
2. Uses a single composite action for deployment logic to avoid duplication.
3. Supports automatic promotion from CI and manual promotion by environment.

## Triggers

- `workflow_run` on successful `CI_react-fastapi-template` for `main` and `feature/**`.
- Manual `workflow_dispatch` with:
  - `env` (`dev | uat | prod`, default `dev`)
  - `deploy_frontend` (boolean)
  - `deploy_backend` (boolean)

## Promotion Logic

1. `feature/**` CI success -> `deploy_dev`
2. `main` CI success -> `deploy_dev` then `deploy_uat`
3. `prod` deploy -> manual only (`workflow_dispatch` with `env=prod`)

## Required GitHub Configuration

Configure these per GitHub Environment (`dev`, `uat`, `prod`).

### Environment Variables

- `FRONTEND_AZURE_WEBAPP_NAME`
- `BACKEND_AZURE_WEBAPP_NAME`

### Environment Secrets

- `FRONTEND_AZURE_WEBAPP_PUBLISH_PROFILE`
- `BACKEND_AZURE_WEBAPP_PUBLISH_PROFILE`

Notes:
- If a variable/secret is missing for one target, that service step is skipped.
- `uat` depends on successful `dev` deployment.
- `prod` depends on successful `uat` and manual dispatch.

## Environment

- Use GitHub Environments: `dev`, `uat`, `prod`.
- Configure required reviewers for `prod` for manual approval gates.

## Operational Notes

1. Frontend deploy package path: `frontend`.
2. Backend deploy package path: `backend`.
3. Composite action wraps `azure/webapps-deploy@v3` for both services.
4. Runtime startup commands (if needed) should be configured in Azure Web App settings.

## Recommended Azure App Settings

### Backend

- `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- Startup command example: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind=0.0.0.0:8000`

### Frontend (Next.js)

- `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- Ensure Node runtime version supports Next.js 14.
- Startup command example: `npm run start -- -p 8080`

## Manual Deployment Examples

GitHub UI:
1. Actions -> `CD_react-fastapi-template`
2. Run workflow
3. Select branch + `env` + service booleans

GitHub CLI:
```bash
gh workflow run continuous_deployment.yaml --ref main -f env=uat
gh workflow run continuous_deployment.yaml --ref main -f env=prod -f deploy_frontend=true -f deploy_backend=true
```
