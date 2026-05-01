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
8. [Phase 6 — Authenticated App Redesign](#8-phase-6--authenticated-app-redesign)
9. [Phase 7 — Admin Settings Panel & Live Config](#9-phase-7--admin-settings-panel--live-config)
10. [Tech Debt Backlog](#10-tech-debt-backlog)
11. [Infrastructure & DevOps](#11-infrastructure--devops)
12. [Completion Tracker](#12-completion-tracker)

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
`get_stats()` now queries the latest `PriceHistory` document for `tao_price`, `market_cap`, and `volume_24h`. Falls back to `0.0` until PriceService completes its first sync. Also fixed symbol mismatch: query now uses `"TAO/USD"` to match what `PriceService` writes.

### ~~BUG-003 — `.env.example` Missing~~ ✅ FIXED 2026-05-01
Root `.env.example` created with all required variables, Docker defaults, and inline comments for every setting.

### ~~BUG-004 — `render.yaml` Incomplete~~ ✅ FIXED 2026-05-01
All backend and frontend env vars added with `sync: false` for secrets. Python bumped to 3.12, `startCommand` and `rootDir` corrected per service.

### ~~BUG-005 — Structlog `multiple values for argument 'event'` in Background Services~~ ✅ FIXED 2026-05-01
All 5 background services (`health`, `price`, `metagraph`, `github`, `news`) were passing `event=` as a keyword arg to `log_sync()`, which internally calls structlog with the first positional string already serving as `event`. Removed the redundant `event=` kwarg from every call site. Health monitor, price sync, and all other schedulers now log cleanly without error.

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

### 4.1 Admin Authentication Middleware ✅ DONE
- [x] `require_staff` dependency in `backend/dependencies/auth.py` — verifies `@deaistrategies.io` Firebase token, raises `403` for everyone else
- [x] Fixed `get_current_user` to read `Authorization` header via `Header(None)` (was incorrectly wired as query param)
- [x] `require_staff` exported from `backend/dependencies/__init__.py`

### 4.2 Implement `/api/admin/approve-access` ✅ DONE
**File:** `backend/api/routes/admin.py`
- [x] Accepts `email` + optional `extend_hours` in request body (typed Pydantic model)
- [x] Finds most recent non-revoked `TemporaryAccess` for that email
- [x] Marks `approved = True` with `approved_at` timestamp
- [x] Optionally extends TTL by `extend_hours` from approval time
- [x] Returns success/already-approved/404 with token details
- [x] Gated behind `require_staff` — returns `403` for non-staff callers

### 4.3 Implement `/api/admin/status` ✅ DONE
- [x] Returns pending requests (unapproved, non-expired, non-revoked `TemporaryAccess` docs)
- [x] Returns counts: pending, approved, revoked, expired, total
- [x] Pending list sorted newest first with email, created_at, expires_at, request_count
- [x] Gated behind `require_staff`

### 4.4 Admin Dashboard — Frontend ✅ DONE
- [x] `frontend/src/pages/AdminPage.tsx` — stats panel (pending/approved/revoked/expired counts), pending requests table with Approve button, skeleton loaders, error/success banners
- [x] Staff-domain guard — shows Access Denied for non-`@deaistrategies.io` accounts
- [x] Admin sidebar item only visible to staff users
- [x] `api.ts` — fixed `API_BASE_URL` to use `import.meta.env.VITE_API_URL` (was using wrong CRA env var), updated `getAdminStatus` and `approveAccess` to match backend response shapes
- [x] `types/index.ts` — added `AdminStatusData` and `PendingRequest` interfaces

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

## 8. Phase 6 — Authenticated App Redesign

**Goal:** Completely redesign the authenticated experience — everything visible after login. The landing page and sign-in overlay are not touched.
**Estimate:** 1–2 weeks

### Design Principles
- Dark mode by default on load, matching the landing page visual identity
- Light/dark toggle in the app header — preference saved to `localStorage`
- Source of truth for colours and style: existing landing page (`#10131f` background, `#5b5ef4`/`#7c7fff` purple/blue accents, `#dde4f8` text)
- Professional and clean — serious analytics platform aesthetic, not a generic dashboard
- Intentional white space — balanced, not wasted, not cluttered
- No raw Tailwind utility aesthetics — all components should feel custom and polished

### 8.1 Sidebar Redesign ✅
- [x] Collapsed by default — icon-only, narrow strip
- [x] Expand/collapse via toggle button — smooth CSS transition
- [x] Active page state clearly highlighted with accent colour
- [x] Correct proportions — sidebar should not dominate screen real estate
- [x] Dark/light mode aware

### 8.2 Global Layout & Theme System ✅
- [x] Create a theme context (`ThemeContext`) — provides `dark` / `light` mode to all components
- [x] Save theme preference to `localStorage`, restore on load
- [x] Dark mode colour tokens: background `#10131f`, surface `#161929`, border `rgba(91,94,244,0.2)`, text `#dde4f8`, muted `#8492be`
- [x] Light mode colour tokens: clean white/grey professional palette
- [x] Toggle button in app header (sun/moon icon)

### 8.3 Card & Component System ✅
- [x] Redesign stat cards — elevation with subtle shadow, colour-coded accent bars, strong typographic hierarchy
- [x] Redesign data tables — proper row hover states, clear column headers, alternating row treatment
- [x] Redesign empty states — illustrated or icon-based, not blank white boxes
- [x] Redesign loading skeletons — match new dark card style

### 8.4 Dashboard Page Redesign ✅
- [x] Key metrics row — large, bold stat cards with icons and trend indicators
- [x] Subnet table — clean, scannable, sortable with visible sort controls
- [x] Category distribution — proper chart or visual breakdown, not an empty box
- [x] News snippet section — card-based, not plain text list

### 8.5 Internal Pages Redesign ✅
- [x] News page — card grid layout, source badges, timestamp formatting
- [x] Research page — article cards with excerpt, category tag, read-more CTA
- [x] Education/Lessons page — structured lesson cards with progress indicators
- [ ] Portfolio page — holdings table with P&L colour coding *(deferred — no portfolio data model yet)*
- [ ] Settings page — clean form layout with section grouping *(deferred — no settings backend yet)*

### 8.6 Admin Page Redesign ✅
- [x] Stats panel — pending/approved/revoked/expired counts as proper stat cards
- [x] Pending requests table — clean table with email, date, action button
- [x] Approve button — styled consistently with accent theme
- [x] Success/error banners — styled alert components matching new theme
- [x] Access Denied state — designed, not a plain text message

---

## 9. Phase 7 — Admin Settings Panel & Live Config

**Goal:** Move every runtime-configurable value out of `.env` and into a MongoDB-backed settings store, manageable through the admin panel UI. Staff can update API keys, sync intervals, and feature flags without touching files or restarting the app. Each credential section includes a **Test Connection** button to validate before saving.

**Estimate:** 1–2 weeks

### What Stays in `.env` (Bootstrap Secrets — Cannot Move)
These are required before the app can connect to anything, so they must remain as environment variables:
- `MONGODB_URL` — needed to connect to the DB where all other settings live
- `FIREBASE_PROJECT_ID` / `GOOGLE_APPLICATION_CREDENTIALS` — needed to authenticate users before the panel is reachable
- `SENTRY_DSN` — infrastructure-level error tracking, set at deploy time
- `VITE_FIREBASE_*` — frontend vars baked into the bundle at build time

### What Moves to the Settings Panel
| Group | Settings |
|-------|----------|
| Data Sources | TaoStats API key, CoinGecko API key, GitHub personal access token |
| Sync Intervals | Metagraph (min), Price (min), News (min), GitHub (min) |
| Notifications | SendGrid API key, sender email address, notification recipient list |
| App Behaviour | CORS allowed origins, rate limit (requests/minute per IP) |
| Feature Flags | Enable/disable each background service independently |

---

### 7.1 Backend — AppConfig Model & Repository
- [ ] Create `AppConfig` MongoDB model — fields: `key` (unique), `value`, `category`, `label`, `is_secret` (bool), `updated_at`, `updated_by`
- [ ] On startup: seed `AppConfig` from env vars for any key not already present in DB — env vars act as defaults, DB values take precedence at runtime
- [ ] Create `config_service.py` — `get(key)`, `set(key, value)`, `get_all_by_category()` functions used by background services instead of reading `os.environ` directly
- [ ] Update all 5 background services (`metagraph`, `price`, `news`, `github`, `health`) to read their API keys and intervals from `config_service` at each run cycle — changes propagate on next tick without restart

### 7.2 Backend — Config API Endpoints
- [ ] `GET /api/admin/config` — returns all config grouped by category; secret values masked as `"••••••••"` in response
- [ ] `PUT /api/admin/config` — accepts `{ key: string, value: string }`, validates key is in allowed list, writes to DB, returns updated record; all endpoints gated behind `require_staff`
- [ ] `POST /api/admin/config/test/taostats` — makes a lightweight test call to TaoStats API using the stored key, returns `{ ok: bool, latency_ms: int, detail: string }`
- [ ] `POST /api/admin/config/test/coingecko` — tests CoinGecko key with a `/ping` call
- [ ] `POST /api/admin/config/test/github` — tests GitHub token with a `/rate_limit` call, returns remaining quota
- [ ] `POST /api/admin/config/test/sendgrid` — validates SendGrid key with their key validation endpoint

### 7.3 Frontend — Settings Page
- [ ] Build `/settings` page (currently a stub) — visible to staff only, redirect others to dashboard
- [ ] Layout: left nav with category tabs (Data Sources, Sync Intervals, Notifications, App Behaviour, Feature Flags)
- [ ] Fetch all config on load via `GET /api/admin/config`; show skeleton while loading
- [ ] Each secret field renders as masked (`••••••••`) with a show/hide toggle (eye icon)
- [ ] Each field has an inline **Save** button — fires `PUT /api/admin/config` on click, shows spinner then success/error feedback inline
- [ ] Unsaved changes tracked per field — dirty fields highlighted with accent border, **Save** button enabled only when value differs from loaded value

### 7.4 Frontend — Test Connection Buttons
- [ ] Each Data Source row has a **Test** button beside the API key field
- [ ] On click: fires `POST /api/admin/config/test/{service}`, shows spinner
- [ ] On success: green badge — `✓ Connected  (42 ms)`
- [ ] On failure: red badge — `✕ Failed — Invalid API key` (detail from backend)
- [ ] Test result clears after 30 seconds or when the field value changes
- [ ] Sync Interval fields show the next scheduled run time based on current interval value

### 7.5 Frontend — Feature Flags
- [ ] Toggle switches (not checkboxes) for each background service: Metagraph Sync, Price Sync, News Sync, GitHub Sync
- [ ] Toggle fires `PUT /api/admin/config` immediately on change (no separate Save for booleans)
- [ ] Disabled services show a paused badge in the admin status panel
- [ ] Backend: background services check their enabled flag at the start of each run cycle and skip gracefully if disabled

---

## 10. Tech Debt Backlog

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

## 11. Infrastructure & DevOps

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

## 12. Completion Tracker

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

*This plan was generated from a full codebase audit on 2026-05-01. Last updated: 2026-05-01 — Phase 1 complete, Phase 2 tasks 4.1–4.4 done, Phase 6 (Redesign) complete, Phase 7 (Admin Settings Panel) planned. Overall: ~90%.*
