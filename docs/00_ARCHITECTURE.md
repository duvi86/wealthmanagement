# Architecture Overview

Status: Active.

## Purpose

This document describes the end-to-end architecture of the TwinOps React + FastAPI template, including boundaries between frontend, backend, and design system layers.

## System Topology

1. Frontend (`frontend/`)
   - Next.js App Router application.
   - Renders pages, calls backend APIs, and applies design-system tokens.

2. Backend (`backend/`)
   - FastAPI application exposing typed REST endpoints.
   - Handles domain logic and data access.

3. Data Layer
   - SQLAlchemy-based models and DB integration.
   - Seed/sample workflows for template bootstrapping.

4. CI/CD Layer (`.github/workflows/continuous_integration.yaml`, `.github/workflows/continuous_deployment.yaml`)
   - Frontend lint + build gates.
   - Backend smoke test gate.
   - Environment promotion flow for deploy (`dev` -> `uat` -> `prod`).

## Frontend Architecture

### Route Layer

- `frontend/app/` contains route pages (`/okr`, `/dependencies`, `/capacity`, `/charts`, etc.).
- Pages should orchestrate reusable components and hooks, not hold large business logic blocks.

### UI Composition Layer

- `frontend/components/ui/` contains reusable primitives and domain wrappers.
- Shared patterns (buttons, cards, charts, tables, forms, modals, tabs, badges) are centralized here.

### Data Access Layer

- `frontend/hooks/use-api.ts` defines React Query hooks.
- `frontend/lib/api-client.ts` centralizes HTTP behavior.
- `frontend/lib/types.ts` defines frontend contract types.

### Styling Layer

- Entry: `frontend/styles/styles.css`.
- Tokens: `frontend/styles/design-system/`.
- Modules: `frontend/styles/styles/00...12`.
- Rule: use token variables; avoid ad hoc hardcoded values where tokens exist.

## Backend Architecture

### API Layer

- Route handlers in `backend/app/api/routes/`.
- Health and domain endpoints include config, OKR, dependencies, capacity, chatbot.

### Schema Layer

- Pydantic schemas in `backend/app/schemas/` define external request/response contracts.

### Service Layer

- Domain logic in `backend/app/services/`.
- Keep route handlers thin and delegate domain behavior to services.

### Persistence Layer

- SQLAlchemy integration and DB setup in backend app modules.
- Tests and local startup should work with documented local setup.

## Contract Governance

1. Backend response/request schema changes must be reflected in `frontend/lib/types.ts`.
2. Frontend hook changes must preserve backend endpoint compatibility.
3. CI must remain green on both frontend and backend jobs.

## Quality Gates

1. Frontend:
   - `npm run lint`
   - `npm run build`
2. Backend:
   - `pytest -q`

## Design-System Governance

1. Add new token values only in `design-system/` files.
2. Keep category ownership by stylesheet module (`00`-`11`), utilities in `12` only.
3. Use typography size/line tokens for text sizing consistency.

## Extension Guidelines

1. New route:
   - Add page under `frontend/app/<route>/page.tsx`.
   - Compose existing UI components first.
   - Add/extend hooks and types only as needed.

2. New API endpoint:
   - Add route + schema + service updates.
   - Add backend smoke coverage for contract behavior.
   - Update frontend hooks/types and docs.

3. New reusable component:
   - Place under `frontend/components/ui/`.
   - Style in matching modular CSS category file.
   - Document via component catalog route where applicable.
