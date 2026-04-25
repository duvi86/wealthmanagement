# TwinOps React + FastAPI Template

A Git template for building enterprise portfolio-management UIs with the GSK design system, powered by a **Next.js App Router** frontend and a **FastAPI** backend, deployed as an Azure Web App via a pre-wired GitHub Actions CD pipeline.

Clone the template, run it immediately with in-memory sample data, then connect to PostgreSQL and Azure when you are ready for a shared deployment.

---

## What is included

| Area | What you get |
|---|---|
| GSK design system | CSS design tokens, modular stylesheets, GSK Precision fonts (⚠️ proprietary — SSO-protected repo), GSK logo |
| UI component library | Cards, buttons, badges, progress bars, KPI tiles, OKR workbench, chatbot widget — reusable across pages |
| 14 demo pages | Home, Components, Forms, Tables, Charts, OKR, Dependencies, Capacity, Config, Temporal, Exploratory, Advanced, Notifications, ChatBot |
| In-memory data out of the box | FastAPI returns sample data — no database or credentials needed to run locally |
| PostgreSQL integration | Optional — switch on Docker Compose to use a live Postgres schema with seed data |
| ChatBot widget | AI assistant UI + API route, mock mode ready |
| CD pipeline | GitHub Actions: Docker image → ACR → Azure Web App (dev / uat / prod environments) |
| CI pipeline | GitHub Actions: ESLint, Next.js build, pytest on every push / PR |
| API contracts | Pydantic schemas on the backend, typed React Query hooks on the frontend — always in sync |

---

## Common tasks

| Task | Where to look |
|---|---|
| Add a new page | Create a folder under `frontend/app/` with a `page.tsx` and add a nav link in `app-shell.tsx` |
| Create a new component | Add to `frontend/components/ui/`, export from the barrel, style in `frontend/styles/` |
| Edit sample data | Modify the in-memory fixtures in the relevant `backend/app/services/` file |
| Switch to PostgreSQL | Run `docker compose up -d`, then restart the backend |
| Update the visual theme | Edit tokens in `frontend/styles/design-system/` |
| Add a backend route | Add a router in `backend/app/api/routes/`, register in `backend/app/main.py`, add Pydantic schema in `backend/app/schemas/` |
| Deploy to production | See [docs/12_DEPLOYMENT_WORKFLOW.md](docs/12_DEPLOYMENT_WORKFLOW.md) |

### Wealth Accounts CSV import

The Accounts page supports bulk upload from a **wide CSV** format where each date column is a snapshot balance.

- Required static columns: `owner_name`, `account_name`, `institution`, `account_type`, `currency`, `expected_return_pct`, `allocation_bucket`
- Optional static column: `fx_to_eur` (if omitted, importer fetches live FX-to-EUR by currency)
- Date columns: any header matching `YYYY-MM-DD` (for example `2026-01-31`)
- Each non-empty date cell creates one account entry for that date
- Duplicate rows (same owner/account/institution/type/currency/date) are skipped on re-import

Template file:
- [docs/templates/wealth-accounts-import-template.csv](docs/templates/wealth-accounts-import-template.csv)

---

## Documentation

| Guide | What it covers |
|---|---|
| [docs/00_ARCHITECTURE.md](docs/00_ARCHITECTURE.md) | System architecture, layer boundaries, data flow |
| [docs/01_PHASE0.md](docs/01_PHASE0.md) | Initial scaffold and repo structure |
| [docs/02_PHASE1_LIGHT_THEME.md](docs/02_PHASE1_LIGHT_THEME.md) | Design-system tokens and base component skin |
| [docs/03_PHASE2_BACKEND_CONTRACTS.md](docs/03_PHASE2_BACKEND_CONTRACTS.md) | FastAPI + Pydantic API contracts |
| [docs/04_PHASE3_POSTGRES_SCHEMA.md](docs/04_PHASE3_POSTGRES_SCHEMA.md) | PostgreSQL schema, migrations, seed data |
| [docs/05_PHASE4_FRONTEND_INTEGRATION.md](docs/05_PHASE4_FRONTEND_INTEGRATION.md) | React Query data hooks, typed API client |
| [docs/06_PHASE5_WAVE_A_SHELL_NAV.md](docs/06_PHASE5_WAVE_A_SHELL_NAV.md) | App shell, navigation, layout |
| [docs/07_PHASE5_WAVES_BCD.md](docs/07_PHASE5_WAVES_BCD.md) | Component library, domain workflows, chatbot route |
| [docs/08_PHASE6_QA_CI.md](docs/08_PHASE6_QA_CI.md) | QA gate and CI pipeline |
| [docs/12_DEPLOYMENT_WORKFLOW.md](docs/12_DEPLOYMENT_WORKFLOW.md) | CD pipeline, Azure Web App setup, secrets, multi-env |

---

## Tutorial

### 1. Setup

#### 1.A — Create your repo instance from the template

On GitHub, click **"Use this template"** to create your own repository, then clone it.

#### 1.B — Set up your environment and run the app (in-memory data)

**Backend**

```bash
# macOS / Linux
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```powershell
# Windows
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open **http://127.0.0.1:8000/docs** to explore the API.  
The backend starts immediately — data is served from in-memory sample fixtures (no credentials needed).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

#### 1.C — Switch to PostgreSQL (optional)

Start the database:

```bash
docker compose up -d
```

Restart the backend — it will auto-connect to Postgres and apply the schema.

---

### 2. App tour

#### 2.A — Project structure and Copilot instructions

```
frontend/
  app/              Next.js App Router pages (one folder per route)
  components/ui/    Reusable UI primitives (Button, Card, KpiCard, …)
  hooks/            Typed React Query data hooks
  lib/              API client + shared TypeScript types
  styles/
    design-system/  CSS custom-property tokens (colors, spacing, typography)
    styles/         Modular numbered stylesheet modules (00–12)

backend/
  app/
    api/routes/     FastAPI route handlers
    schemas/        Pydantic request / response models
    services/       Deterministic service functions (business logic)
    db/             SQLAlchemy models and seed data

docs/               Architecture and phase delivery notes
.github/
  workflows/        CI and CD GitHub Actions pipelines
  actions/          Composite deploy-to-azure-webapp action
  copilot-instructions.md   Copilot system prompt for this repo
```

**Copilot instructions:** `.github/copilot-instructions.md` acts as a system prompt for GitHub Copilot. It defines project context and code standards so prompts can focus on the feature being built.

#### 2.B — Design system and components

The UI is built in three layers:

- `frontend/styles/design-system/` — CSS custom-property tokens (colours, spacing, typography)
- `frontend/styles/styles/` — Modular stylesheets (numbered `00_reset` → `12_utilities`)
- `frontend/components/ui/` — Typed React primitives consuming those tokens

```tsx
import { KpiCard } from "@/components/ui/kpi-card";
import { SurfaceCard } from "@/components/ui/surface-card";

<KpiCard label="OKRs on track" value="8 / 12" detail="+2 this quarter" />
```

Pages import and compose these components — no UI code is ever duplicated.

#### 2.C — Pages, hooks and data flow

Each folder under `frontend/app/` is a route handled by Next.js App Router.

Data is fetched via typed React Query hooks in `frontend/hooks/use-api.ts`:

```ts
// hooks/use-api.ts
export function useOkrStructure() {
  return useQuery({ queryKey: ["okr-structure"], queryFn: () => apiClient.get("/api/okr/structure") });
}
```

The API client in `frontend/lib/api-client.ts` points to the FastAPI backend. All request/response shapes are defined once in `frontend/lib/types.ts` and mirrored by Pydantic schemas in `backend/app/schemas/`.

#### 2.D — How to add a page

1. Create `frontend/app/my-feature/page.tsx` with your component tree.
2. Add a nav link in `frontend/app/app-shell.tsx`.
3. If the page needs data, add a route in `backend/app/api/routes/`, a schema in `backend/app/schemas/`, and a hook in `frontend/hooks/use-api.ts`.

---

### 3. Continuous Deployment

#### 3.A — Azure prerequisites: ACR and Azure Web App

The CD pipeline builds a Docker image and pushes it to an Azure Container Registry (ACR). The Azure Web App pulls and serves that image directly.

Before running the pipeline for the first time:

- Create an Azure Container Registry → [Microsoft docs](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal)
- Create an Azure Web App (Linux, Docker container) → [Microsoft docs](https://learn.microsoft.com/en-us/azure/app-service/quickstart-custom-container)
- Note the ACR **Login server**, **Username**, and **Password** (Azure Portal → Container registries → your registry → Settings → Access Keys)

→ Full setup: [docs/12_DEPLOYMENT_WORKFLOW.md](docs/12_DEPLOYMENT_WORKFLOW.md)

#### 3.B — When do the CI and CD pipelines run?

**CI pipeline** (`continuous_integration.yaml`) — runs ESLint, Next.js build, and pytest.

| Event | Branches | Triggered? |
|---|---|---|
| push (`.ts`, `.tsx`, `.py`, `requirements.txt`, …) | `main` or `feature/**` | ✅ Yes |
| Pull request targeting `main` | any source branch | ✅ Yes |
| Manual dispatch | any | ✅ Yes |

**CD pipeline** (`continuous_deployment.yaml`) — three chained jobs, one per environment.

| Event | Branch | dev | uat | prod |
|---|---|---|---|---|
| CI pipeline completes | `feature/**` | ✅ auto | ❌ | ❌ |
| CI pipeline completes | `main` | ✅ auto | ✅ auto (after dev) | ❌ |
| Manual dispatch `env=dev` | any | ✅ | ❌ | ❌ |
| Manual dispatch `env=uat` | any | ✅ prereq | ✅ | ❌ |
| Manual dispatch `env=prod` | `main` (recommended) | ✅ prereq | ✅ prereq | ✅ with approval |

#### 3.C — GitHub Workflow: secrets and variables

Create a `.env` file at the project root (never commit it):

```bash
# SECRETS (encrypted in GitHub)
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
DOCKER_REGISTRY_SERVER_USERNAME=your-acr-username
DOCKER_REGISTRY_SERVER_PASSWORD=your-acr-password

# VARIABLES (plain text in GitHub)
DOCKER_REGISTRY_SERVER_URL=yourregistry.azurecr.io
ACR_IMAGE_NAME=your-image-name
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=your-resource-group
AZURE_WEBAPP_NAME=your-web-app-name
```

Push secrets and variables to the `dev` GitHub Environment:

```bash
# macOS / Linux / WSL
OWNER="gsk-tech"
REPO="twinops-react-fastapi-template"
ENV_NAME="dev"

gh auth login
gh api --method PUT -H "Accept: application/vnd.github+json" \
  "repos/$OWNER/$REPO/environments/$ENV_NAME"

source .env

gh secret set AZURE_TENANT_ID                 --env "$ENV_NAME" --body "$AZURE_TENANT_ID"
gh secret set AZURE_CLIENT_ID                 --env "$ENV_NAME" --body "$AZURE_CLIENT_ID"
gh secret set AZURE_CLIENT_SECRET             --env "$ENV_NAME" --body "$AZURE_CLIENT_SECRET"
gh secret set DOCKER_REGISTRY_SERVER_USERNAME --env "$ENV_NAME" --body "$DOCKER_REGISTRY_SERVER_USERNAME"
gh secret set DOCKER_REGISTRY_SERVER_PASSWORD --env "$ENV_NAME" --body "$DOCKER_REGISTRY_SERVER_PASSWORD"

gh variable set DOCKER_REGISTRY_SERVER_URL --env "$ENV_NAME" --body "$DOCKER_REGISTRY_SERVER_URL"
gh variable set ACR_IMAGE_NAME             --env "$ENV_NAME" --body "$ACR_IMAGE_NAME"
gh variable set AZURE_SUBSCRIPTION_ID      --env "$ENV_NAME" --body "$AZURE_SUBSCRIPTION_ID"
gh variable set AZURE_RESOURCE_GROUP       --env "$ENV_NAME" --body "$AZURE_RESOURCE_GROUP"
gh variable set AZURE_WEBAPP_NAME          --env "$ENV_NAME" --body "$AZURE_WEBAPP_NAME"
```

```powershell
# PowerShell (Windows)
gh auth login
$OWNER    = "gsk-tech"
$REPO     = "twinops-react-fastapi-template"
$ENV_NAME = "dev"

gh api --method PUT -H "Accept: application/vnd.github+json" `
  "repos/$OWNER/$REPO/environments/$ENV_NAME"

$e = Get-Content .env | ConvertFrom-StringData

gh secret set AZURE_TENANT_ID                 --env $ENV_NAME --body $e.AZURE_TENANT_ID
gh secret set AZURE_CLIENT_ID                 --env $ENV_NAME --body $e.AZURE_CLIENT_ID
gh secret set AZURE_CLIENT_SECRET             --env $ENV_NAME --body $e.AZURE_CLIENT_SECRET
gh secret set DOCKER_REGISTRY_SERVER_USERNAME --env $ENV_NAME --body $e.DOCKER_REGISTRY_SERVER_USERNAME
gh secret set DOCKER_REGISTRY_SERVER_PASSWORD --env $ENV_NAME --body $e.DOCKER_REGISTRY_SERVER_PASSWORD

gh variable set DOCKER_REGISTRY_SERVER_URL --env $ENV_NAME --body $e.DOCKER_REGISTRY_SERVER_URL
gh variable set ACR_IMAGE_NAME             --env $ENV_NAME --body $e.ACR_IMAGE_NAME
gh variable set AZURE_SUBSCRIPTION_ID      --env $ENV_NAME --body $e.AZURE_SUBSCRIPTION_ID
gh variable set AZURE_RESOURCE_GROUP       --env $ENV_NAME --body $e.AZURE_RESOURCE_GROUP
gh variable set AZURE_WEBAPP_NAME          --env $ENV_NAME --body $e.AZURE_WEBAPP_NAME
```

Push to `main` — the pipeline runs automatically and:

1. Authenticates to Azure with the service principal
2. Injects runtime environment variables into the Web App
3. Builds and pushes two Docker image tags to the ACR:
   - `latest` — pulled by the Web App on every deploy
   - `YYYYMMDD-HHMMSS-<short-SHA>` — immutable snapshot for rollback
4. Restarts the Web App so it immediately loads the new image

#### 3.D — Make the Azure Web App serve the Docker container (one-time)

In the Azure Portal → your Web App → **Deployment** → **Deployment Center**:

| Setting | Value |
|---|---|
| Container type | Single container |
| Image source | Azure Container Registry |
| Registry | Your ACR |
| Authentication | Admin Credentials |
| Image | Your image name |
| Image tag | `latest` |
| Continuous deployment | ✅ Enabled (optional) |

→ [Microsoft docs — Deploy a custom container](https://learn.microsoft.com/en-us/azure/app-service/deploy-custom-container)

#### 3.E — Promoting to prod

`prod` is never deployed automatically — it always requires an explicit manual dispatch and human approval.

Configure **Required Reviewers** on the `prod` GitHub Environment (repo Settings → Environments → prod → Protection rules).

```bash
# Trigger from main; then approve via the GitHub Actions UI
gh workflow run continuous_deployment.yaml --ref main -f env=prod
```

→ Full multi-environment setup: [docs/12_DEPLOYMENT_WORKFLOW.md](docs/12_DEPLOYMENT_WORKFLOW.md)


## Current Status
- Phase 0: scaffold completed
- Phase 1: light-theme tokens and base component skin completed
- Phase 2: typed FastAPI API contracts completed
- Phase 3: PostgreSQL schema and seed data completed
- Phase 4: frontend React Query integration completed
- Phase 5 Wave A: global shell and navigation completed
- Phase 5 Waves B-D: component library, domain workflows, and chatbot route completed
- Phase 6: QA and CI pipeline completed
- Phase 7: QA gate plan documented
- Phase 8: starter-kit hardening plan documented
- Phase 9: final handoff and release-candidate checklist documented

## Structure
- `frontend/`: Next.js (App Router) frontend
- `backend/`: FastAPI backend with SQLAlchemy and PostgreSQL
- `docs/`: phased delivery and implementation notes

## Architecture
- `docs/00_ARCHITECTURE.md`: system architecture and layer boundaries

## Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (for local PostgreSQL)

## Run Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run Database
```bash
docker compose up -d
```

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```

## Production Build Check
```bash
cd frontend
npm run build
```

## Deployment

- CI workflow: `.github/workflows/continuous_integration.yaml`
- Deploy workflow: `.github/workflows/continuous_deployment.yaml`
- Composite deploy action: `.github/actions/deploy-to-azure-webapp/action.yaml`
- Deployment setup guide: `docs/12_DEPLOYMENT_WORKFLOW.md`

## Primary Routes
- `http://localhost:3000/`
- `http://localhost:3000/okr`
- `http://localhost:3000/dependencies`
- `http://localhost:3000/capacity`
- `http://localhost:3000/config`
- `http://localhost:3000/charts`
- `http://localhost:3000/temporal`
- `http://localhost:3000/components`
- `http://localhost:3000/forms`
- `http://localhost:3000/tables`
- `http://localhost:3000/advanced`
- `http://localhost:3000/exploratory`
- `http://localhost:3000/notifications`
- `http://localhost:3000/chatbot`

## Phase Docs
- `docs/00_ARCHITECTURE.md`
- `docs/01_PHASE0.md`
- `docs/02_PHASE1_LIGHT_THEME.md`
- `docs/03_PHASE2_BACKEND_CONTRACTS.md`
- `docs/04_PHASE3_POSTGRES_SCHEMA.md`
- `docs/05_PHASE4_FRONTEND_INTEGRATION.md`
- `docs/06_PHASE5_WAVE_A_SHELL_NAV.md`
- `docs/07_PHASE5_WAVES_BCD.md`
- `docs/08_PHASE6_QA_CI.md`
- `docs/09_PHASE7_QA_GATE.md`
- `docs/10_PHASE8_HARDENING.md`
- `docs/11_PHASE9_HANDOFF.md`
- `docs/12_DEPLOYMENT_WORKFLOW.md`
