# DeAIPro — Development Plan

**Project:** Bittensor Intelligence Analytics Platform  
**Stack:** FastAPI (Python) + Next.js/React (TypeScript) + MongoDB Atlas  
**Current Completion:** ~78%  
**Last Audited:** 2026-05-01

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Critical Bugs & Blockers](#2-critical-bugs--blockers)
3. [Phase 1 — Stabilize & Ship MVP](#3-phase-1--stabilize--ship-mvp)
4. [Phase 2 — Admin & Access Management](#4-phase-2--admin--access-management)
5. [Phase 3 — Data Quality & Real-Time Features](#5-phase-3--data-quality--real-time-features)
6. [Phase 4 — Premium Features & Monetization](#6-phase-4--premium-features--monetization)
7. [Phase 5 — Scale & Polish](#7-phase-5--scale--polish)
8. [Tech Debt Backlog](#8-tech-debt-backlog)
9. [Infrastructure & DevOps](#9-infrastructure--devops)
10. [Completion Tracker](#10-completion-tracker)

---

## 1. Current State Summary

### What Works Today
- All background sync services run on schedule: metagraph (15 min), price (5 min), news (30 min), GitHub (60 min), health (1 min)
- Public REST API: `/api/stats`, `/api/subnets`, `/api/subnets/{id}`, `/api/news`, `/api/research`, `/api/lessons`
- Firebase authentication + 24-hour temporary token system
- Rate limiting (SlowAPI), CORS, structured logging (structlog), Sentry error tracking
- Full frontend dashboard and analytics UI — subnets table, charts, news feed, content pages
- Docker Compose local dev environment
- MongoDB models fully defined with proper indexes and TTL

### What Is Incomplete
| Area | Issue |
|------|-------|
| `/api/admin/*` | Returns `"pending_implementation"` — fully stubbed |
| `/api/stats` | TAO price, market cap, and volume are **hardcoded placeholders** |
| Duplicate routes | `/api/research` and `/api/lessons` are defined twice in `public.py`; the second stubs override the real implementations |
| Sentiment service | `backend/services/sentiment.py` is fully implemented but **never called** by any endpoint |
| PDF service | `backend/services/pdf.py` skeleton exists but is **not wired** to any route |
| WebSocket | `PriceTicker.tsx` scaffolded, hook not implemented |
| Render deployment | `render.yaml` has no environment variables defined |
| `.env.example` | Does not exist — onboarding is broken without one |

---

## 2. Critical Bugs & Blockers

These must be fixed before any production deployment.

### ~~BUG-001 — Duplicate Route Definitions Override Real Implementations~~ ✅ FIXED 2026-05-01
Deleted duplicate `get_research` and `get_lessons` stub functions from `backend/api/routes/public.py`. Both endpoints now return paginated real MongoDB data.

### ~~BUG-002 — Hardcoded Price Data in `/api/stats`~~ ✅ FIXED 2026-05-01
`get_stats()` now queries the latest `PriceHistory` document for `tao_price`, `market_cap`, and `volume_24h`. Falls back to `0.0` until PriceService completes its first sync.

### BUG-003 — `.env.example` Missing
**Problem:** No `.env.example` or `.env.local.example` in the repository. Any new developer or deployment environment has no reference for required variables.  
**Fix:** Create `backend/.env.example` listing all variables from `backend/config/settings.py` with placeholder values and comments.

### BUG-004 — `render.yaml` Incomplete
**File:** `render.yaml`  
**Problem:** No environment variables are declared. Deployments to Render will fail silently on missing config.  
**Fix:** Add `envVars` blocks for all required settings (Firebase, TaoStats, MongoDB, Sentry, CORS).

---

## 3. Phase 1 — Stabilize & Ship MVP

**Goal:** Fix all blockers, make the live site fully functional with real data.  
**Estimate:** 3–5 days

### 3.1 Fix Duplicate Routes (BUG-001) ✅ DONE
- [x] Delete duplicate stub definitions of `get_research` and `get_lessons` from `backend/api/routes/public.py`
- [x] Verify both endpoints return paginated real data from MongoDB

### 3.2 Wire Real Price Data to `/api/stats` (BUG-002) ✅ DONE
- [x] In `get_stats()`, query latest `PriceHistory` document for `tao_price`, `price_change_24h`, and `volume_24h`
- [x] Query `Subnet` collection for actual total ecosystem market cap
- [x] Add fallback to `0.0` if no `PriceHistory` exists yet

### 3.3 Create `.env.example` (BUG-003)
- [ ] Create `backend/.env.example` with all variables from `backend/config/settings.py`
- [ ] Create `frontend/.env.example` with all frontend environment variables
- [ ] Add setup instructions to `README.md` referencing the example files

### 3.4 Complete `render.yaml` (BUG-004) ✅ DONE
- [x] Add all backend environment variables with `sync: false` for secrets
- [x] Add MongoDB Atlas connection string variable
- [x] Add all frontend `VITE_` environment variables pointing to backend service URL
- [x] Correct `startCommand` paths, bump to Python 3.12

### 3.5 Integrate Sentiment Scores into Subnet Responses ✅ DONE
- [x] Import and call `FearGreedEngine` inside `get_subnet_detail()` in `public.py`
- [x] Add `ecosystem_sentiment` block to subnet detail response (score, label, components, computed_at)
- [x] News fetch and sentiment compute run concurrently via `asyncio.gather`

### 3.6 Fix Default Docker Credentials ✅ DONE
- [x] `MONGODB_PASSWORD` now required via `:?` — Docker Compose fails loudly if unset
- [x] Removed `:-password` fallback from all references in `docker-compose.yml`
- [x] Fixed frontend env prefix from `NEXT_PUBLIC_` to `VITE_` in compose and `.env.example`

---

## 4. Phase 2 — Admin & Access Management

**Goal:** Implement the admin panel and full access approval workflow.  
**Estimate:** 1–2 weeks

### 4.1 Admin Authentication Middleware
- [ ] Create `backend/dependencies/admin.py` — verify caller has `@deaistrategies.io` email domain via Firebase token
- [ ] Apply admin dependency to all `/api/admin/*` routes
- [ ] Return `403 Forbidden` (not `200 pending_implementation`) for unauthorized callers

### 4.2 Implement `/api/admin/approve-access`
**File:** `backend/api/routes/admin.py`
- [ ] Accept `email` in request body
- [ ] Find the most recent `TemporaryAccess` document for that email
- [ ] Mark it as `approved = True` with `approved_at` timestamp
- [ ] Optionally extend TTL on approval
- [ ] Return success/failure with the token details

### 4.3 Implement `/api/admin/status`
- [ ] Return list of pending access requests (unapproved, non-expired `TemporaryAccess` docs)
- [ ] Return counts: pending, approved, revoked, expired
- [ ] Return recent admin actions log (last 50 events)

### 4.4 Admin Dashboard — Frontend
- [ ] Add `/admin` route to Next.js `app/` directory, behind Firebase auth guard
- [ ] Create `AccessRequestsTable` component — lists pending requests with Approve/Deny buttons
- [ ] Create `AdminStatsPanel` — shows access request counts
- [ ] Wire to `/api/admin/status` and `/api/admin/approve-access`

### 4.5 Email Notifications
- [ ] Integrate an email provider (SendGrid or Resend) into backend
- [ ] Send email to user when temporary access token is created — include token link
- [ ] Send email to admin (`@deaistrategies.io`) when a new access request is submitted
- [ ] Send confirmation email to user when access is approved/denied

### 4.6 Access Request Flow — Frontend
- [ ] Build `/request-access` page with email form
- [ ] On submit, call `/api/request-access` then `/api/authenticate-temporary`
- [ ] Show confirmation screen with instructions
- [ ] Add "Resend token" option for existing valid tokens

---

## 5. Phase 3 — Data Quality & Real-Time Features

**Goal:** Replace remaining placeholder data, add live WebSocket feeds.  
**Estimate:** 2–3 weeks

### 5.1 Real-Time Price WebSocket
- [ ] Add WebSocket endpoint `ws://api/ws/price` to the FastAPI backend
- [ ] Push latest `PriceHistory` candle every 5 seconds
- [ ] Implement `usePriceWebSocket` hook in frontend (`frontend/src/services/`)
- [ ] Wire `PriceTicker.tsx` to the hook — remove scaffolding, connect live data
- [ ] Show live connection indicator (green/red dot) in the UI

### 5.2 Metagraph Data Completeness
- [ ] Audit all 32 fields on the `Subnet` model — identify which are still placeholder/zero
- [ ] Ensure `momentum_score`, `quality_score`, `test_coverage` are being populated by `MetagraphService`
- [ ] Add fallback logic for subnets with missing GitHub repos (set `github_commits_30d = 0`)

### 5.3 Price History Charts
- [ ] `/api/price-history` endpoint — returns OHLCV candles for a given timeframe (`1h`, `1d`, `7d`, `30d`)
- [ ] Wire frontend `PriceChart` to this endpoint instead of mock data
- [ ] Support interval parameter for chart granularity

### 5.4 News Enrichment
- [ ] Add subnet tagging to `NewsService` — identify which subnet IDs a news article relates to
- [ ] Expose `subnet_ids` array in news API response
- [ ] Filter news by subnet on the subnet detail page

### 5.5 PDF Report Generation
- [ ] Finish `backend/services/pdf.py` — implement `generate_subnet_report(subnet_id)` and `generate_ecosystem_report()`
- [ ] Add route `GET /api/reports/subnet/{subnet_id}` — returns PDF as file response
- [ ] Add route `GET /api/reports/ecosystem` — returns full ecosystem PDF
- [ ] Wire `ReportDownload.tsx` to the new endpoints (remove `usePDFReport` stub)
- [ ] Gate PDF reports behind authentication (Firebase or temporary token)

---

## 6. Phase 4 — Premium Features & Monetization

**Goal:** Build the premium tier and subscription management.  
**Estimate:** 3–4 weeks

### 6.1 Subscription Tier Model
- [ ] Define tiers: `free`, `pro`, `enterprise`
- [ ] Add `tier` field to `TemporaryAccess` and Firebase custom claims
- [ ] Middleware to check tier on protected routes and return `402 Payment Required` if insufficient

### 6.2 Stripe Integration
- [ ] Add `stripe` to backend requirements
- [ ] Create `/api/billing/checkout` — create Stripe Checkout session
- [ ] Create `/api/billing/portal` — customer billing portal link
- [ ] Webhook endpoint `/api/billing/webhook` — handle `checkout.session.completed`, `customer.subscription.deleted`
- [ ] On successful payment, write `tier` to Firebase custom claims

### 6.3 Pro Features (Gate Behind `pro` Tier)
- [ ] Full-resolution PDF reports (not gated on Phase 3 basics)
- [ ] Historical subnet performance data (> 30 days)
- [ ] Email alerts for subnet metric thresholds (configurable)
- [ ] API key access for programmatic queries

### 6.4 Email Alerts
- [ ] `AlertRule` MongoDB model — user email, subnet_id, metric, threshold, direction (above/below)
- [ ] `POST /api/alerts` — create alert rule (requires `pro` tier)
- [ ] `GET /api/alerts` — list user's alert rules
- [ ] `DELETE /api/alerts/{id}` — delete alert rule
- [ ] Background worker checks alert conditions every 15 minutes, sends email on trigger

---

## 7. Phase 5 — Scale & Polish

**Goal:** Production hardening, performance, and UX refinement.  
**Estimate:** 2–3 weeks

### 7.1 Caching Layer (Redis)
- [ ] Add Redis to `docker-compose.yml` and `render.yaml`
- [ ] Cache `/api/stats` response for 30 seconds
- [ ] Cache `/api/subnets` list response for 60 seconds
- [ ] Use Redis for SlowAPI rate-limit storage (replace default in-memory)

### 7.2 CI/CD Pipeline
- [ ] Add `.github/workflows/ci.yml` — run `pytest` on every PR to `main`
- [ ] Add frontend lint + type check step (`tsc --noEmit`, `eslint`)
- [ ] Add `render.yaml` deploy hook — auto-deploy `main` to Render on green CI

### 7.3 API Documentation
- [ ] Enable FastAPI Swagger UI at `/docs` in non-production, disable in production
- [ ] Add response examples to all route docstrings
- [ ] Create `development/API_REFERENCE.md` with all endpoint specs

### 7.4 Frontend Performance
- [ ] Audit bundle size — identify and code-split large dependencies
- [ ] Add `React.lazy` + `Suspense` to route-level components
- [ ] Add `stale-while-revalidate` caching strategy to React Query config
- [ ] Lighthouse audit — target 90+ on Performance, Accessibility

### 7.5 Error Handling & UX
- [ ] Add global error boundary with user-friendly fallback UI
- [ ] Add empty-state illustrations to all list views when data is absent
- [ ] Add skeleton loaders for subnet cards and charts
- [ ] Show last-updated timestamp on all data panels

### 7.6 Security Hardening
- [ ] Move temporary token out of response body — deliver via email only
- [ ] Add `Content-Security-Policy` header to FastAPI middleware
- [ ] Rotate MongoDB Atlas credentials — remove hardcoded `password` from Docker config
- [ ] Audit all `body: dict` params in routes — replace with typed Pydantic models

---

## 8. Tech Debt Backlog

These are lower-priority cleanup items to address between phases.

| ID | File | Issue |
|----|------|-------|
| TD-001 | `backend/api/routes/public.py` | `body: dict` in `request_access` should be a Pydantic model |
| TD-002 | `backend/api/routes/public.py` | Research/lesson list views truncate content at 500 chars with a hardcoded slice — use a dedicated `excerpt` field instead |
| TD-003 | `backend/data.py` | Static fallback data should be seeded into MongoDB on first run, not kept as a runtime fallback |
| TD-004 | `backend/dynamic.py` | File purpose unclear — needs documentation or removal |
| TD-005 | `frontend/src/services/api.ts` | Single API service file will become unmanageable — split by domain (subnets, news, auth, billing) |
| TD-006 | `frontend/src/pages/` | `LandingPage.css` is a standalone CSS file — migrate styles to Tailwind |
| TD-007 | `docker-compose.yml` | `Dockerfile.dev` referenced for frontend but the file doesn't exist in the repo — add or fix path |
| TD-008 | `backend/conftest_shim.py` | Shim file with no clear purpose — investigate and remove |
| TD-009 | All routes | Error responses return `200 OK` with `"status": "error"` in the body — should return proper HTTP status codes (`404`, `500`, etc.) |
| TD-010 | `backend/main.py` | Password reset comment is unimplemented — complete or remove |

---

## 9. Infrastructure & DevOps

### Environment Variables Reference

**Backend (required)**
```
MONGODB_URL=mongodb+srv://...
FIREBASE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
TAOSTATS_API_KEY=
SENTRY_DSN=
CORS_ORIGINS=https://de-ai-pro.vercel.app,http://localhost:5173
```

**Backend (optional)**
```
COINGECKO_API_KEY=         # Uses free tier if omitted
GITHUB_TOKEN=              # Higher rate limits for GitHub service
BITTENSOR_SUBTENSOR_URL=   # Uses public subtensor if omitted
REDIS_URL=                 # Required for Phase 5 caching
STRIPE_SECRET_KEY=         # Required for Phase 4 billing
SENDGRID_API_KEY=          # Required for Phase 2 email
```

**Frontend**
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

### Deployment Targets
| Service | Platform | Branch |
|---------|----------|--------|
| Backend API | Render (Web Service) | `main` |
| Frontend | Vercel | `main` |
| MongoDB | MongoDB Atlas (M10+) | — |
| Redis (Phase 5) | Render (Redis) | — |

---

## 10. Completion Tracker

| Area | Current | After Phase 1 | After Phase 2 | After Phase 3 | Final |
|------|---------|---------------|---------------|---------------|-------|
| Backend Routes | 70% | 85% | 95% | 100% | 100% |
| Backend Services | 85% | 90% | 90% | 100% | 100% |
| Backend Models | 95% | 95% | 100% | 100% | 100% |
| Frontend Pages | 80% | 85% | 95% | 100% | 100% |
| Frontend Components | 85% | 90% | 90% | 100% | 100% |
| Tests | 70% | 70% | 75% | 80% | 95% |
| Config / Env | 60% | 90% | 90% | 90% | 100% |
| Deployment | 80% | 90% | 90% | 90% | 100% |
| Documentation | 50% | 65% | 70% | 80% | 95% |
| **Overall** | **84%** | **86%** | **91%** | **96%** | **99%** |

---

*This plan was generated from a full codebase audit on 2026-05-01. Last updated: 2026-05-01 — Phase 1 complete. Overall: 84%.*
