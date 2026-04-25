# Phase 5 Waves B-D: Components, Workflows, and Chatbot

Status: Complete.

## Wave B: Reusable Component Library

Implemented reusable UI primitives in `frontend/components/ui/`:
- `page-frame.tsx`: route-level shell wrapper and standardized page header
- `surface-card.tsx`: shared neutral content container
- `form-field.tsx`: consistent label + control composition
- `kpi-card.tsx`: compact KPI card for dashboard-style summaries
- `status-pill.tsx`: standardized semantic status badge
- `empty-state.tsx`: neutral empty-list and no-data presentation

Also extended shared CSS and typography:
- Added `body3` text utility
- Added utility classes for page headers, split rows, KPI grids, cards, form rows, and chatbot UI
- Added danger-button and chat thread/message styles

## Wave C: Domain Workflow Enhancements

### OKR Page (`/okr`)
- Added KPI rollups: objectives, key results, initiatives, average objective progress
- Refactored objective/key result/initiative rendering into reusable cards and status pills
- Added explicit empty state for missing seed data

### Dependencies Page (`/dependencies`)
- Added editable source KR input to inspect different KR dependency graphs
- Added KPI summary: total, positive, negative, weighted dependent progress
- Added standardized create/delete workflow feedback
- Refactored list and form to shared reusable components

### Capacity Page (`/capacity`)
- Added KPI preview row from input values (owner/support/total/FTE)
- Added structured result card with semantic status pill and interpretation text
- Refactored form fields and actions to shared component patterns

### Config Page (`/config`)
- Added KPI summary for core config values
- Added structured key/value details view
- Added explicit empty state fallback

## Wave D: Chatbot Integration

Added new chatbot route and wired it into navigation:
- New route: `/chatbot`
- New page: `frontend/app/chatbot/page.tsx`
- Nav entry added in `frontend/app/app-shell.tsx`

Chatbot page features:
- Conversation thread with user/assistant role styling
- Send message workflow using existing `useChatbot` hook
- API call to backend `/api/chat`
- Optional source display for assistant responses
- Empty state before first message

## Verification Notes

- Workspace diagnostics: no frontend TypeScript errors reported
- Backend API contract reused with no route changes required

## User Validation Checklist

1. Start backend and frontend servers.
2. Verify nav includes `Chatbot` and route transitions across all pages.
3. Verify OKR page shows KPI rollups and objective hierarchy.
4. Verify dependencies page supports source KR changes, create, and delete actions.
5. Verify capacity page computes and displays RAG result status.
6. Verify config page shows KPI summary and details table.
7. Verify chatbot page sends/receives messages from `/api/chat`.
8. Verify responsive behavior on mobile width (menu toggle + page readability).
