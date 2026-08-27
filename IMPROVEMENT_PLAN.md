# Restock: Phase 7-11 Improvement Roadmap

This document is a phased implementation plan for the next round of improvements to the Restock app (FastAPI + SQLAlchemy backend, React 18 frontend). Phases 0-6 (initial CRUD, auth, forecasting, EDA, alerts, purchase orders) are complete and in production use at portfolio scale; this roadmap picks up from there and addresses the security, performance, architecture, UX, and feature gaps identified in a full code audit of the current codebase. Every change below is scoped for a solo developer working incrementally, not a team-scale enterprise rewrite.

---

## Phase 7: Security Hardening

Security issues are the highest-severity items in the codebase — a default JWT secret shipped in `docker-compose.yml`, no role enforcement despite a `UserRole` enum already existing on the `User` model, and unguarded concurrent writes to stock quantities. This phase should be done first and in full before Phase 8/9 work begins.

### Change 7.1: Fail startup on insecure JWT secret in production
- **Files:** `backend/config.py`, `backend/auth.py`, `.env.example`, `docker-compose.yml`
- **Issue(s):** #1
- **Effort:** S
- **Approach:** Add an `environment: str = "development"` field to `Settings` in `backend/config.py` (env-driven, same pattern as `jwt_secret_key`). At import time in `backend/auth.py`, right after `SECRET_KEY = settings.jwt_secret_key` (line 24), add a guard: `if settings.environment == "production" and SECRET_KEY == "dev-secret-change-me": raise RuntimeError(...)`. Update `docker-compose.yml`'s `JWT_SECRET_KEY: change-me-in-production` default to a comment instructing operators to set a real value via a `.env` file or secret store, and add `ENVIRONMENT=production` to the compose service. Document the required env vars in `.env.example`.
- **Tests:** Add a backend test that instantiates `Settings(environment="production", jwt_secret_key="dev-secret-change-me")` and asserts the guard raises; a second test asserts a non-default secret in production passes silently. Follow the existing `backend/tests/` file-per-concern convention (e.g. new `backend/tests/test_config.py`).
- **Dependencies:** None.

### Change 7.2: Add rate limiting to auth and write endpoints
- **Files:** `requirements.txt`, `backend/main.py`, `backend/routers/auth.py`
- **Issue(s):** #2
- **Effort:** S
- **Approach:** Add `slowapi==0.1.9` to `requirements.txt`. In `backend/main.py`, instantiate a `Limiter(key_func=get_remote_address)`, attach it to `app.state.limiter`, and register `SlowAPIMiddleware` plus the `RateLimitExceeded` exception handler alongside the existing `CORSMiddleware` block. Apply a strict limit (e.g. `@limiter.limit("5/minute")`) to `POST /auth/login` and `POST /auth/register` in `backend/routers/auth.py` to blunt credential-stuffing/brute-force, and a looser default (e.g. `"60/minute"`) globally via `app.state.limiter.limit(...)` on the app if slowapi's global default limit is used. Skip the chatbot sub-app for now (see Change 9.2) since it's a separate `FastAPI()` instance.
- **Tests:** Add an httpx-based test (reusing the existing `TestClient` + `db_session` fixture pattern from `backend/tests/conftest.py`) that hammers `/auth/login` more than the limit and asserts a 429 is eventually returned.
- **Dependencies:** None.

### Change 7.3: Add refresh tokens with shorter-lived access tokens
- **Files:** `backend/auth.py`, `backend/routers/auth.py`, `backend/schemas.py`, `backend/models.py`, `frontend/src/api/auth.js`, `frontend/src/context/AuthContext.js`
- **Issue(s):** #3
- **Effort:** M
- **Approach:** Shorten `ACCESS_TOKEN_EXPIRE_MINUTES` (backend/auth.py:26) from 24h to ~15-30 minutes. Add a `RefreshToken` model (id, user_id FK, token_hash, expires_at, revoked_at nullable) to `backend/models.py`, sequenced through the Alembic migration introduced in Change 8.1. On `POST /auth/login`, issue both an access token and a refresh token (store only a hash of the refresh token, mirroring how bcrypt already hashes passwords in `backend/auth.py`); return both in the response body. Add `POST /auth/refresh` that validates the refresh token against the stored hash/expiry and issues a new access token. Update `frontend/src/api/auth.js` and `frontend/src/context/AuthContext.js` to store the refresh token and call `/auth/refresh` when appropriate (pairs with the 401 interceptor in Change 7.9, which should trigger the refresh-then-retry flow).
- **Tests:** Backend: login returns both tokens; `/auth/refresh` with a valid refresh token issues a new access token; an expired/revoked refresh token is rejected with 401. Frontend: mock the refresh call in a new `frontend/src/api/auth.test.js` (jest.mock pattern from `ProductsPage.test.js`) and assert `AuthContext` retries a failed request after refreshing.
- **Dependencies:** Change 8.1 (Alembic, for the new table's migration). Pairs with Change 7.9 for the frontend retry-on-401 flow, but can ship backend-first.

### Change 7.4: Add refresh token revocation on logout
- **Files:** `backend/routers/auth.py`, `backend/models.py`, `frontend/src/api/auth.js`, `frontend/src/context/AuthContext.js`
- **Issue(s):** #3
- **Effort:** S
- **Approach:** Add `POST /auth/logout` that accepts the refresh token and sets `revoked_at` on the matching `RefreshToken` row (from Change 7.3). `get_current_user` (backend/routers/auth.py:50) doesn't need to change since access tokens remain short-lived and stateless — only refresh-token validation needs to check `revoked_at IS NULL`. Update the frontend logout flow in `AuthContext.js` to call the new endpoint before clearing local token state.
- **Tests:** Logout revokes the refresh token; a subsequent `/auth/refresh` call with the revoked token returns 401.
- **Dependencies:** Change 7.3.

### Change 7.5: Add role-based access control (`require_admin`)
- **Files:** `backend/routers/auth.py`, `backend/routers/products.py`, `backend/routers/warehouses.py`, `backend/routers/suppliers.py`, `backend/routers/purchase_orders.py`, `backend/routers/stock.py`
- **Issue(s):** #4
- **Effort:** M
- **Approach:** In `backend/routers/auth.py`, add a `require_admin(current_user: User = Depends(get_current_user)) -> User` dependency next to the existing `get_current_user`/`get_current_user_optional` (lines 50, 68) that raises `HTTPException(403)` unless `current_user.role == UserRole.admin` (the enum already exists on `models.User`, currently unused for authorization). Swap `Depends(get_current_user)` for `Depends(require_admin)` on administrative write endpoints — create/update/deactivate on products, warehouses, suppliers, and PO cancellation — while leaving staff-level day-to-day operations (stock adjustments, receiving POs, creating forecasts) on the plain `get_current_user` dependency. Document the split explicitly in a comment block in `routers/auth.py` so the boundary is intentional.
- **Tests:** For each admin-gated endpoint, assert a `staff`-role user gets 403 and an `admin`-role user succeeds; add `staff_user`/`admin_user` fixtures to `conftest.py` (none currently distinguish roles).
- **Dependencies:** None, but Change 11.6 (admin user-management panel) needs this dependency to exist first.

### Change 7.6: Add row locking to `adjust_stock`
- **Files:** `backend/routers/stock.py`
- **Issue(s):** #5
- **Effort:** S
- **Approach:** In `adjust_stock` (backend/routers/stock.py, ~line 30-60), change the `StockLevel` lookup to use `.with_for_update()` so the read-then-write of `quantity_on_hand` (lines 54, 58) is protected against a concurrent request reading the same stale value. This is a no-op under SQLite (which serializes writes anyway) but becomes load-bearing on Postgres, per `backend/database.py`'s stated Postgres-readiness — note this in a code comment.
- **Tests:** A test that drives two concurrent adjustments against the same `StockLevel` row and asserts the final `quantity_on_hand` reflects both deltas (skip/xfail under SQLite with a comment if true concurrency can't be exercised there).
- **Dependencies:** None.

### Change 7.7: Add row locking to `receive_purchase_order`
- **Files:** `backend/routers/purchase_orders.py`
- **Issue(s):** #6
- **Effort:** S
- **Approach:** Same fix as Change 7.6, applied to the `stock_level.quantity_on_hand += receipt.quantity` read-then-write around `backend/routers/purchase_orders.py:174-176`.
- **Tests:** Mirror the concurrency test from Change 7.6, driven through `POST /purchase-orders/{id}/receive`.
- **Dependencies:** None (land alongside 7.6).

### Change 7.8: Document rationale for nullable `SalesRecord.product_id`/`warehouse_id`
- **Files:** `backend/models.py`, `backend/ingest.py`
- **Issue(s):** #7
- **Effort:** S
- **Approach:** Tightening these columns to non-nullable is **not recommended** — `backend/ingest.py`'s `_get_or_create_warehouse`/`_get_or_create_product` rely on the nullable bridge for legacy CSV uploads. Add a docstring/comment on both columns in `backend/models.py` explaining this is intentional, not an oversight. No functional change.
- **Tests:** None required; optionally a regression test asserting `_get_or_create_*` is still called for every ingested row.
- **Dependencies:** None.

### Change 7.9: Add frontend 401 response interceptor
- **Files:** `frontend/src/api/client.js`, `frontend/src/context/AuthContext.js`
- **Issue(s):** #8
- **Effort:** S
- **Approach:** Add `client.interceptors.response.use(...)` in `frontend/src/api/client.js` alongside the existing request interceptor (line 9). On 401: attempt a silent refresh via Change 7.3's endpoint and retry once, falling through to logout if that also fails (or, if 7.3 hasn't landed yet, just clear the token and redirect to `/login`, upgrading later). Expose a `setUnauthorizedHandler(fn)` hook from `AuthContext` that `client.js` calls into, avoiding a circular import.
- **Tests:** New `frontend/src/api/client.test.js` simulating a 401 and asserting the interceptor clears auth state / redirects.
- **Dependencies:** Ideally after Change 7.3; can ship logout-only first.

---

## Phase 8: Performance & Scalability

These issues surface under concurrent/real-world load: synchronous ML training and matplotlib rendering blocking the request thread, N+1 queries, unbounded result sets, and no migration tooling for schema evolution.

### Change 8.1: Introduce Alembic and a baseline migration
- **Files:** `requirements.txt`, `backend/alembic.ini` (new), `backend/alembic/env.py` (new), `backend/alembic/versions/0001_baseline.py` (new), `backend/main.py`, `.github/workflows/backend-ci.yml`, `docker-compose.yml`
- **Issue(s):** #15
- **Effort:** M
- **Approach:** Add `alembic==1.13.x`. Run `alembic init alembic` under `backend/`, point `env.py`'s `target_metadata` at `Base.metadata`, and set `sqlalchemy.url` from `config.settings.database_url` at runtime. Generate a baseline migration via `--autogenerate` so it's a no-op on existing DBs (document `alembic stamp head` for anyone with an existing `restock.db`). Remove `Base.metadata.create_all(bind=engine)` from `backend/main.py:18` and replace with `alembic upgrade head` in the Docker entrypoint/CI. Update `backend-ci.yml` to run migrations before pytest, and `docker-compose.yml`'s backend command likewise.
- **Tests:** CI check that `alembic upgrade head` + `--autogenerate` produces no diff. Keep `conftest.py`'s `db_session` fixture on `create_all` for test speed (documented divergence from the real app's migration path).
- **Dependencies:** None, but sequence first within Phase 8 — several later changes (7.3's `RefreshToken` table, 8.8's indexes) need this.

### Change 8.2: Move forecast training to a background task
- **Files:** `backend/routers/forecast.py`, `backend/forecasting.py`, `backend/schemas.py`
- **Issue(s):** #9
- **Effort:** M
- **Approach:** `create_forecast_run()` runs synchronously in `POST /forecast`, training `RandomForestRegressor(n_estimators=200)` twice inline (backend/forecasting.py:87,93). Change the endpoint to: create the `ForecastRun` row immediately with `status="pending"` and return right away; use FastAPI's built-in `BackgroundTasks` (no new broker needed at this scale) to run training after the response is sent, updating status to `completed`/`failed`. Update `ForecastRunRead` to include `status`.
- **Tests:** `POST /forecast` returns quickly with `pending` status; assert `status` reaches `completed` (FastAPI's `TestClient` already runs `BackgroundTasks` before returning in tests).
- **Dependencies:** Change 8.1 if `ForecastRun.status` needs a migration.

### Change 8.3: Move EDA chart rendering and CSV persistence to a background task
- **Files:** `backend/routers/upload.py`, `backend/routers/eda.py`, `backend/eda.py`, `backend/schemas.py`
- **Issue(s):** #10
- **Effort:** M
- **Approach:** `perform_eda()` (backend/eda.py:31) renders 4 matplotlib/seaborn charts synchronously inside the upload request. Keep file upload + validation synchronous (fast, needs immediate error feedback); move persistence (`ingest.persist_sales_records`) and chart generation to a `BackgroundTasks` job, tracked via an `UploadHistory` `status` field. `GET /eda` returns cached results if ready, or a `processing` status otherwise, replacing the current single-shot read of `app.state.data_path`. Sets up the data model Change 9.1 needs.
- **Tests:** `POST /upload` returns promptly; `UploadHistory.status` transitions `processing` → `completed`; `GET /eda` reflects both states correctly.
- **Dependencies:** Do alongside Change 8.4 (decomposition makes the split easier).

### Change 8.4: Decompose the upload monolith into testable functions
- **Files:** `backend/routers/upload.py`, `backend/data_processing.py`, `backend/ingest.py`
- **Issue(s):** #16
- **Effort:** M
- **Approach:** Split `upload_file` (backend/routers/upload.py:21) into `validate_upload`, `persist_records` (already close to `ingest.persist_sales_records`), and `generate_eda_summary` (already `eda.perform_eda`); the handler becomes a thin orchestrator. No behavior change beyond what 8.3 introduces — makes Changes 8.5 and 10.7 easier to land independently.
- **Tests:** Unit tests per extracted function in isolation, not only end-to-end HTTP tests.
- **Dependencies:** None strictly; do alongside/before 8.3 and 8.5.

### Change 8.5: Fix N+1 query in `ingest.py`'s row-by-row existence check
- **Files:** `backend/ingest.py`
- **Issue(s):** #11
- **Effort:** S
- **Approach:** `persist_sales_records` (backend/ingest.py:40) does a `db.query(SalesRecord.id)...first()` per CSV row (line 68). Replace with one batched dedup query before the loop: build the set of natural-key tuples from the incoming DataFrame, query existing keys in one shot (`SalesRecord.date` is already indexed), hold in a Python `set`, and check membership in-memory inside the loop.
- **Tests:** Upload a CSV with a mix of already-persisted and new rows; assert correct dedup behavior is preserved and a query-count assertion catches regressions back to per-row queries.
- **Dependencies:** Change 8.4 makes isolation easier but isn't required.

### Change 8.6: Fix N+1 query pattern in `recompute_alerts` while preserving cross-product correctness
- **Files:** `backend/routers/alerts.py`
- **Issue(s):** #12
- **Effort:** M
- **Approach:** `recompute_alerts` (backend/routers/alerts.py:25) already batches `StockLevel` into a dict (line 40) but still does an individual `Alert` existence query inside the nested product×warehouse loop (lines 44-58). **This nested iteration itself must stay** — it's what catches untouched zero-stock products with no `StockLevel` row at all, a deliberate correctness fix from an earlier phase. Fix only the query count: load all open `Alert`s once before the loop into a `(product_id, warehouse_id)`-keyed dict, and look up existence there instead of querying per-pair.
- **Tests:** Regression test confirming the "zero-stock product with no `StockLevel` row still gets an alert" property still holds; a query-count test to catch regressions.
- **Dependencies:** None.

### Change 8.7: Add pagination to all unpaginated list endpoints
- **Files:** `backend/schemas.py`, `backend/routers/products.py`, `backend/routers/suppliers.py`, `backend/routers/warehouses.py`, `backend/routers/forecast.py`, `backend/routers/purchase_orders.py`, `backend/routers/stock.py`, `backend/routers/alerts.py`, and the 7 corresponding frontend list pages
- **Issue(s):** #13
- **Effort:** M
- **Approach:** Add a generic `PaginatedResponse[T]` (Pydantic `Generic`) to `backend/schemas.py`: `{items: List[T], total: int}`. For each list endpoint, add `skip: int = Query(0, ge=0), limit: int = Query(50, le=200)`, change `response_model` accordingly, and wrap the query with `.offset(skip).limit(limit).all()` plus a `.count()` for `total`. Preserve existing filter params. On the frontend, unwrap `{items, total}` and add a minimal "Load more" control (append to existing state) per page — least invasive across 7 pages.
- **Tests:** Backend: `total` reflects full count while `items` respects `limit`/`skip` per endpoint. Frontend: extend the `jest.mock('../api/products')` pattern (from `ProductsPage.test.js`) to the paginated shape across all 7 pages, adding test files for pages that don't have one yet.
- **Dependencies:** None; do after Change 8.1 is scaffolded in case of migration needs (this change itself needs no schema change).

### Change 8.8: Add missing indexes on foreign key columns
- **Files:** `backend/models.py`, new Alembic migration
- **Issue(s):** #14
- **Effort:** S
- **Approach:** Add `index=True` to `StockLevel.product_id`/`warehouse_id`, `StockMovement.product_id`/`warehouse_id`/`created_by`, `PurchaseOrderItem.purchase_order_id`/`product_id`, `PurchaseOrder.supplier_id`/`warehouse_id`/`created_by`, `Alert.product_id`/`warehouse_id`. Generate the migration via `alembic revision --autogenerate`. Prioritize `StockLevel`/`Alert` first since Changes 8.6 and 7.6 query on those.
- **Tests:** No behavior test needed; assert the migration applies cleanly.
- **Dependencies:** Change 8.1.

---

## Phase 9: Architecture & Code Quality

Correctness/maintainability issues that don't block production today but create risk (unclipped negative forecasts, hardcoded holiday calendar, a shared-state bug waiting to happen under multi-user load) and debt (a toy chatbot, dead legacy HTML, missing ORM relationship helpers).

### Change 9.1: Replace `app.state.data_path` global with DB-backed per-upload state
- **Files:** `backend/main.py`, `backend/routers/upload.py`, `backend/routers/eda.py`, `backend/models.py`, `backend/config.py`
- **Issue(s):** #17
- **Effort:** M
- **Approach:** `backend/main.py:33` sets `app.state.data_path = None`; uploads overwrite it; `routers/eda.py` reads that single shared value — a known single-tenant "stopgap" per the code's own comment. Extend `UploadHistory` with the processed file path per upload. Change `GET /eda` to accept an `upload_id` (or `?latest=true` default) and look up the path from the DB. Remove the `app.state.data_path` assignment entirely once migrated. Build this as a continuation of Change 8.3, which already needs an `UploadHistory`-keyed status field.
- **Tests:** Two sequential uploads each get their own `GET /eda` result instead of the second clobbering the first; assert `app.state` no longer carries `data_path`.
- **Dependencies:** Change 8.3.

### Change 9.2: Remove the toy chatbot
- **Files:** `backend/chatbot.py`, `backend/main.py`, any frontend chatbot references
- **Issue(s):** #18
- **Effort:** S
- **Approach:** The current chatbot (a separate unauthenticated `FastAPI()` sub-app, 3-entry exact-match dict, a broken `GET /chat/{user_input}` path-param pattern) doesn't deliver value proportional to hardening or replacing it, and is an unguarded attack surface Change 7.2's rate limiting would otherwise need to special-case. Delete `backend/chatbot.py`, its mount in `main.py`, and any frontend reference — freeing the effort for higher-value Phase 11 work.
- **Tests:** Assert `/chatbot/*` 404s and no dangling imports remain (already caught by CI's startup).
- **Dependencies:** None.

### Change 9.3: Make the holiday calendar configurable
- **Files:** `backend/config.py`, `backend/forecasting.py`, `backend/features.py`
- **Issue(s):** #19
- **Effort:** S
- **Approach:** Add `holiday_country: str = "IN"` to `Settings`, thread it through wherever `holidays.country_holidays("IN")` is hardcoded. Validate against `holidays.list_supported_countries()` at load time or on first use.
- **Tests:** Forecasts trained with `holiday_country="US"` produce different `holidays` feature values than `"IN"`; an invalid country code raises a clear error.
- **Dependencies:** None.

### Change 9.4: Use `Literal` for `ForecastRequest.model_type`
- **Files:** `backend/schemas.py`, `backend/forecasting.py`
- **Issue(s):** #20
- **Effort:** S
- **Approach:** `model_type` (backend/schemas.py:236) is `str = "random_forest"`, only validated at runtime against `VALID_MODEL_TYPES` (backend/forecasting.py:30/123-124). Change to `Literal["moving_average", "random_forest", "exponential_smoothing"]`. Move `VALID_MODEL_TYPES` next to the `Literal` (or derive one from the other) so they can't drift.
- **Tests:** `POST /forecast` with an invalid `model_type` now returns 422 (FastAPI validation) instead of the old runtime `ValueError`; update any test asserting the old error path.
- **Dependencies:** None.

### Change 9.5: Clip forecast predictions to non-negative values
- **Files:** `backend/forecasting.py`
- **Issue(s):** #21
- **Effort:** S
- **Approach:** No clipping exists anywhere (backend/forecasting.py), so predictions can go negative. After generating predictions for all three model types in `create_forecast_run` (line 115), apply `.clip(lower=0)` before persisting `ForecastPrediction` rows, with a comment explaining the domain constraint.
- **Tests:** A synthetic declining-trend case that would otherwise predict negative values asserts all persisted predictions are `>= 0`.
- **Dependencies:** None.

### Change 9.6: Replace naive interpolation in the exponential smoothing path
- **Files:** `backend/forecasting.py`
- **Issue(s):** #22
- **Effort:** M
- **Approach:** `series.asfreq("D").interpolate()` (backend/forecasting.py:103) fabricates values across gaps (e.g. a real stockout reads as smoothed positive sales). Replace the default with `.fillna(0)` (gaps = zero-demand days, the more defensible retail assumption), exposed via a `gap_fill_strategy: Literal["zero", "interpolate"] = "zero"` parameter so interpolation remains available where genuinely appropriate.
- **Tests:** A synthetic series with an artificial gap asserts `"zero"` fills with 0s and `"interpolate"` preserves the old behavior as an opt-in path.
- **Dependencies:** None.

### Change 9.7: Add lag/rolling features to the RandomForest model
- **Files:** `backend/features.py`, `backend/forecasting.py`
- **Issue(s):** #23
- **Effort:** M
- **Approach:** `FEATURE_COLUMNS` (backend/features.py:11) has no lag/rolling features — typically the biggest accuracy lever for tree-based demand forecasting. Add `lag_1`, `lag_7`, `rolling_mean_7`, `rolling_mean_28` per `(product_id, warehouse_id)` group via pandas `.shift()`/`.rolling().mean()`. Drop cold-start rows lacking enough history rather than fabricating fill values. At prediction time, carry forward actual values as the lag basis when forecasting multiple steps ahead.
- **Tests:** Lag/rolling values verified against a small synthetic DataFrame with known expectations; end-to-end forecast integration test still passes.
- **Dependencies:** Change 9.6 (gap-fill strategy) should land first — lag features are sensitive to how gaps are represented.

### Change 9.8: Remove legacy standalone `frontend/index.html` prototype
- **Files:** `frontend/index.html`
- **Issue(s):** #24
- **Effort:** S
- **Approach:** `frontend/index.html` is an old Bootstrap-CDN prototype with inline scripts hitting `/upload`/`/forecast`/`/chatbot/...` directly — unrelated to and unreferenced by the real CRA app (`frontend/public/index.html`). Grep the repo for stray references (Docker COPY, nginx.conf) before deleting, then delete.
- **Tests:** None beyond confirming `npm run build` and the Docker frontend build still succeed (already covered by `frontend-ci.yml`).
- **Dependencies:** None — zero-risk, sequence early.

### Change 9.9: Add `back_populates` to SQLAlchemy relationships
- **Files:** `backend/models.py`
- **Issue(s):** #25
- **Effort:** S
- **Approach:** No relationships currently declare `back_populates`. Add explicit pairs where genuinely useful (`Product.stock_levels`, `Warehouse.stock_levels`, `PurchaseOrder.items` already exists one-directionally) — be conservative, only add what upcoming work (e.g. Change 11.3's audit log viewer wanting `Product.stock_movements`) actually needs.
- **Tests:** For each added relationship, assert `db.get(Product, id).stock_levels` returns expected rows without a manual query.
- **Dependencies:** None functionally (Python-only, no new columns); land after Change 8.1 exists so any accompanying constraint work goes through a migration.

### Change 9.10: Validate `PurchaseOrderCreate` items have unique `product_id`s
- **Files:** `backend/schemas.py`
- **Issue(s):** #26
- **Effort:** S
- **Approach:** `PurchaseOrderCreate` (backend/schemas.py:197) has no uniqueness check; `routers/purchase_orders.py` only checks existence, not uniqueness. Add a Pydantic v2 `@model_validator(mode="after")` raising `ValueError` on duplicate `product_id`s, with a message suggesting combining quantities into one line item.
- **Tests:** Two items sharing a `product_id` returns 422 with the validator's message; existing valid payloads unaffected.
- **Dependencies:** None.

### Change 9.11: Make `_generate_po_number` provably terminating
- **Files:** `backend/routers/purchase_orders.py`
- **Issue(s):** #27
- **Effort:** S
- **Approach:** `_generate_po_number` (backend/routers/purchase_orders.py:45-49) loops `while True` — theoretically unbounded, practically safe given 32 bits of entropy. Add a bounded retry (e.g. 10 attempts, then `RuntimeError`) as a defensive fail-fast measure, not a fix for an observed problem.
- **Tests:** Mock `uuid.uuid4` to always collide and assert `RuntimeError` after the retry limit instead of hanging.
- **Dependencies:** None.

---

## Phase 10: UX, Accessibility & Frontend Polish

Frontend-only or frontend-adjacent fixes, aside from one new backend endpoint (10.6).

### Change 10.1: Add error handling to `handleDeactivate` on the 3 CRUD pages
- **Files:** `frontend/src/pages/ProductsPage.js`, `WarehousesPage.js`, `SuppliersPage.js`
- **Issue(s):** #28
- **Effort:** S
- **Approach:** `handleDeactivate` (ProductsPage.js:51-54, and the equivalents) has no try/catch, causing an unhandled rejection on failure (e.g. a 403 once Change 7.5 lands). Wrap in try/catch and `setError(...)`, matching the pattern already used for create/update on the same pages.
- **Tests:** Extend `ProductsPage.test.js`'s `jest.mock` pattern with a rejected `deactivateProduct` and assert an error message renders; replicate for the other two pages.
- **Dependencies:** None — do early, directly relevant once 7.5 starts returning 403s.

### Change 10.2: Fix `StockAdjustModal`'s `onAdjusted` callback so the product list refreshes
- **Files:** `frontend/src/pages/ProductsPage.js`, `frontend/src/components/StockAdjustModal.js`
- **Issue(s):** #30
- **Effort:** S
- **Approach:** `ProductsPage.js:124` passes `onAdjusted={() => {}}`, discarding the modal's callback (StockAdjustModal.js:29 already calls it correctly). Change to `onAdjusted={() => { setAdjustingProduct(null); refresh(); }}`, reusing the page's existing `refresh()`.
- **Tests:** Extend `ProductsPage.test.js` to assert a successful adjustment triggers a re-fetch / updates the displayed stock value.
- **Dependencies:** None.

### Change 10.3: Wire up the unused `update*()`/`getForecastRun()` API exports
- **Files:** `frontend/src/api/{products,warehouses,suppliers,forecast}.js`, `frontend/src/pages/{ProductsPage,WarehousesPage,SuppliersPage,ForecastPage}.js`
- **Issue(s):** #29
- **Effort:** M
- **Approach:** `updateProduct`/`updateWarehouse`/`updateSupplier`/`getForecastRun` are defined, tested-at-the-backend, and unused on the frontend — real missing product value, not dead code to prune. Add an "Edit" action next to "Deactivate" on the 3 CRUD pages (reuse the existing inline-form pattern, keyed by an `editingId` state) calling `updateX(id, payload)` then `refresh()`. On `ForecastPage.js`, add a "view past runs" list that calls `getForecastRun(runId)` on selection.
- **Tests:** Per-page: clicking "Edit" pre-fills the form and submitting calls `updateX` with the right payload; `ForecastPage` test asserting `getForecastRun` is called and renders predictions.
- **Dependencies:** Reasonable to sequence after Change 8.7 (pagination) for the "past runs" list, though a simple unpaginated first cut is fine given likely run volume.

### Change 10.4: Add accessible labels to the 3 CRUD pages' inline forms
- **Files:** `frontend/src/pages/ProductsPage.js`, `WarehousesPage.js`, `SuppliersPage.js`
- **Issue(s):** #31
- **Effort:** S
- **Approach:** These pages use bare `placeholder`s with no `<label>`/`aria-label` — unlike `StockAdjustModal.js`, which already does `<label htmlFor="...">` correctly on its two fields. Use `StockAdjustModal` as the reference pattern and add matching `<label htmlFor>` (preferred) or `aria-label` to every input on the 3 CRUD pages; keep `placeholder` as supplementary hint text only.
- **Tests:** Extend the RTL tests to use `getByLabelText` queries, which fail if the label/input association breaks — a good regression guard.
- **Dependencies:** None; can land alongside Change 10.3 (same forms).

### Change 10.5: Add accessibility (dialog role, ESC key, focus trap) to `StockAdjustModal`
- **Files:** `frontend/src/components/StockAdjustModal.js`
- **Issue(s):** #31
- **Effort:** S
- **Approach:** Add `role="dialog" aria-modal="true" aria-labelledby="..."` to the modal root. Add a `useEffect` `keydown` listener for `Escape` calling the existing `onClose` prop. For focus trapping, given only ~2-3 focusable elements, a small manual implementation (focus first element on mount, wrap `Tab`/`Shift+Tab` at the boundaries) is reasonable — no new dependency needed.
- **Tests:** RTL: `role="dialog"` present; `Escape` calls `onClose`; `Tab` from the last element wraps to the first.
- **Dependencies:** None.

### Change 10.6: Add `GET /stock/movements` endpoint and a corresponding frontend page
- **Files:** `backend/routers/stock.py`, `backend/schemas.py`, `frontend/src/api/stock.js`, `frontend/src/pages/StockMovementsPage.js` (new), `frontend/src/App.js`
- **Issue(s):** #32
- **Effort:** M
- **Approach:** `StockMovement` rows are already logged (`stock.py`'s `adjust_stock`, `purchase_orders.py`'s `receive_purchase_order`) but never surfaced. Add `GET /stock/movements` with `product_id`/`warehouse_id`/date-range filters and pagination (Change 8.7's `PaginatedResponse`), plus a `StockMovementRead` schema. Add a frontend page rendering a filterable table, routed alongside the others.
- **Tests:** Backend: filter combinations return expected subsets; pagination works. Frontend: new test file following the established `jest.mock` pattern.
- **Dependencies:** Change 8.7 (pagination) should land first.

### Change 10.7: Add real CSV upload validation
- **Files:** `backend/data_processing.py`, `backend/ingest.py`
- **Issue(s):** #33
- **Effort:** M
- **Approach:** `data_processing.py` only validates required columns exist and `date` parses; `ingest.py`'s `int(row.store), int(row.item)` (line 53) has no validation and would raise unhandled on bad input. Add checks for NaN in required numeric columns, negative `sales` (flag rather than silently drop, given ambiguity around whether negatives represent returns), and non-integer/invalid `store`/`item` before they reach `ingest.py`. Return a structured `{valid_rows, rejected_rows, warnings}` summary from the upload response instead of all-or-nothing.
- **Tests:** CSVs with NaNs, negative sales, non-numeric ids, and mixed valid/invalid rows each produce expected accept/reject/warning counts; no unhandled exception propagates from a malformed row.
- **Dependencies:** Change 8.4 (decomposed upload handler) makes this easier to test in isolation.

### Change 10.8: Tune the SQLAlchemy connection pool
- **Files:** `backend/database.py`, `backend/config.py`
- **Issue(s):** #35
- **Effort:** S
- **Approach:** `create_engine()` (backend/database.py:18) passes no `pool_pre_ping`/`pool_size`/`max_overflow`. Add `pool_pre_ping=True` unconditionally (cheap, valuable regardless of backend), and `pool_size`/`max_overflow` (exposed as `Settings` fields, defaulting to 5/10) guarded behind `not settings.database_url.startswith("sqlite")`.
- **Tests:** Assert `engine.pool` reflects configured values for a non-SQLite URL (no real connection needed); existing SQLite suite unaffected since `pool_pre_ping` is a no-op there.
- **Dependencies:** None.

**Note:** the originally-flagged "single-tenant file path" issue (#34) is resolved by Change 9.1, not a separate Phase 10 item — no additional work needed here beyond what 9.1 covers.

---

## Phase 11: New Features & Enhancements

New value layered on a hardened, decomposed base — sized honestly, not padded. A few candidates (full PDF export, a dedicated model-comparison subsystem) are scoped down or deprioritized where effort-to-value is weak at this app's scale.

### Change 11.1: Dashboard KPIs — inventory turnover, stockout rate, forecast accuracy
- **Files:** `backend/routers/dashboard.py` (new), `backend/schemas.py`, `frontend/src/pages/DashboardPage.js`, `frontend/src/api/dashboard.js` (new)
- **Issue(s):** New
- **Effort:** M
- **Approach:** Highest-value addition — all the raw data already exists (`StockMovement`, `SalesRecord`, `ForecastPrediction` vs. actuals) with no aggregate view. Add `GET /dashboard/kpis` computing, over a configurable range: inventory turnover, stockout rate (start with the simpler "current snapshot" version), and forecast accuracy (MAE/MAPE comparing `ForecastPrediction` against actual `SalesRecord` once the forecast date has passed). Extend the existing `DashboardPage.js` with a KPI stat-tile row. Keep to 3-4 metrics, not a sprawling BI dashboard.
- **Tests:** Backend: each KPI calculation against a small synthetic dataset with known expected values. Frontend: new `DashboardPage.test.js` mocking the API per the established pattern.
- **Dependencies:** Change 9.5 (prediction clipping) should land first so accuracy comparisons aren't skewed by negative-prediction artifacts.

### Change 11.2: Automated reorder-suggestion generation from forecasts + reorder points
- **Files:** `backend/routers/reorder.py` (new), `backend/models.py`, `backend/schemas.py`, `frontend/src/pages/ReorderSuggestionsPage.js` (new)
- **Issue(s):** New
- **Effort:** M
- **Approach:** Links two things the app already has but doesn't connect: for each product/warehouse with a recent `ForecastRun`, compare projected demand over the horizon against current stock and the product's reorder point. Add `GET /reorder/suggestions` returning `{product, warehouse, current_stock, forecasted_demand, suggested_order_quantity}` for at-risk pairs. Add a "Create PO from suggestion" action pre-filling the existing PO creation form on `PurchaseOrdersPage.js`.
- **Tests:** Given synthetic stock + reorder point + forecast predictions, assert at-risk pairs are correctly flagged and sufficiently-stocked ones excluded.
- **Dependencies:** None required; natural to sequence near Change 11.1 (shared aggregation helpers).

### Change 11.3: Audit log viewer for existing `StockMovement`/`UploadHistory` data
- **Files:** `frontend/src/pages/AuditLogPage.js` (new), `frontend/src/api/audit.js` (new), possibly `backend/routers/audit.py` (new)
- **Issue(s):** New
- **Effort:** S
- **Approach:** Mostly "surface data already captured." Reuse Change 10.6's `/stock/movements` endpoint directly; add a minimal `GET /upload/history` if one doesn't already exist, following the Change 8.7 pagination pattern. A combined/tabbed frontend page with date/user/product/warehouse filters.
- **Tests:** Frontend page test asserting both data sources render and filters narrow results correctly.
- **Dependencies:** Change 10.6.

### Change 11.4: Search/filtering across entity list pages
- **Files:** `backend/routers/{products,suppliers,warehouses}.py`, corresponding frontend pages
- **Issue(s):** New
- **Effort:** S
- **Approach:** Add `search: Optional[str] = None`, applied as a case-insensitive filter on name (and SKU for products). Combines naturally with Change 8.7's pagination as the same query-param surface. Debounced search input on each page. Simple substring matching only — no full-text search infrastructure needed at this data scale.
- **Tests:** Backend: search narrows results case-insensitively. Frontend: debounced input triggers the right re-fetch, per the established mock pattern.
- **Dependencies:** Change 8.7.

### Change 11.5: Structured logging, `/health`, and a basic `/metrics` endpoint
- **Files:** `backend/main.py`, `backend/config.py`, `requirements.txt`
- **Issue(s):** New
- **Effort:** S
- **Approach:** Upgrade `logging.basicConfig` (backend/main.py:9) to a small stdlib JSON formatter (no need for `structlog` at this scale). Add `GET /health` doing a trivial `SELECT 1`. Add `GET /metrics` via `prometheus-fastapi-instrumentator` (one middleware line) — genuinely worthwhile here as a portfolio-showcase item for low effort.
- **Tests:** `/health` returns `db: "ok"` against the test fixture and a degraded status on a forced DB failure; `/metrics` returns valid Prometheus exposition format.
- **Dependencies:** None.

### Change 11.6: Admin user-management panel
- **Files:** `backend/routers/users.py` (new), `backend/schemas.py`, `frontend/src/pages/UsersPage.js` (new), `frontend/src/api/users.js` (new)
- **Issue(s):** New
- **Effort:** M
- **Approach:** `GET /users` (paginated, admin-only), `PATCH /users/{id}/role`, `PATCH /users/{id}/deactivate`, all gated by Change 7.5's `require_admin`. Frontend admin-only page conditionally rendered on `current_user.role === 'admin'`.
- **Tests:** Non-admins get 403 on all three; admins can list/promote/deactivate; a safeguard test that an admin can't demote/deactivate themselves (avoid a last-admin lockout).
- **Dependencies:** Change 7.5 — has no purpose without it.

### Change 11.7: Notification delivery (email) for alerts
- **Files:** `backend/notifications.py` (new), `backend/routers/alerts.py`, `backend/config.py`, `requirements.txt`
- **Issue(s):** New
- **Effort:** M
- **Approach:** `recompute_alerts` computes alerts but nothing pushes them out. Add stdlib `smtplib`-based email delivery (no new dependency) triggered on new-alert creation, sent to a configurable `alert_notification_emails: List[str]` in `Settings`, fired via `BackgroundTasks` (Change 8.2's pattern) so a slow SMTP call doesn't block the response. Explicitly scope out webhook delivery for now — meaningfully more scope (retries, payload versioning, delivery tracking) for unclear demand at this app's scale.
- **Tests:** Mock SMTP; assert a send is triggered only for newly-created alerts (not on every recompute), and that a send failure is logged, not raised.
- **Dependencies:** Change 8.2's `BackgroundTasks` pattern as reference.

### Change 11.8: CSV export for list/report pages
- **Files:** `backend/routers/products.py`, `backend/routers/purchase_orders.py`, `frontend/src/pages/{ProductsPage,PurchaseOrdersPage}.js`
- **Issue(s):** New
- **Effort:** S
- **Approach:** Add a `GET /products/export`-style endpoint streaming CSV (stdlib `csv` module, no new dependency) for products and purchase orders. Add an "Export CSV" button triggering a direct download. Explicitly scope out PDF export — a meaningfully heavier dependency/rendering addition for low incremental value over CSV at this scale; revisit only if a specific formatted-document need (e.g. a printable PO) arises.
- **Tests:** Backend: exported CSV headers/rows match DB state. Frontend: assert the correct download request fires (actual browser download isn't meaningfully testable in JSDOM).
- **Dependencies:** None.

### Change 11.9: Model-comparison view (light-touch)
- **Files:** `frontend/src/pages/ForecastPage.js`, `backend/routers/forecast.py`
- **Issue(s):** New
- **Effort:** S
- **Approach:** Not a new subsystem — add `GET /forecast/compare?product_id=&warehouse_id=` returning each model type's most recent run side-by-side (reusing existing `ForecastRun`/`ForecastPrediction` data, no new training/storage). Extend `ForecastPage.js` (building on Change 10.3's past-run viewer) with a toggle overlaying multiple model types on the same chart.js chart.
- **Tests:** Backend: one run per model type returned when multiple exist; handles the single-model-type case. Frontend: mock multiple runs, assert overlaid series render.
- **Dependencies:** Change 10.3.

### Change 11.10: API versioning strategy (documentation-only for now)
- **Files:** `backend/main.py`, new `docs/api-versioning.md`
- **Issue(s):** New
- **Effort:** S
- **Approach:** A single-frontend-consumer system doesn't yet justify `/v1`/`/v2` URL versioning. Document the policy instead: currently implicitly `v1`; breaking changes avoided via additive-only schema changes where possible; URL-prefix versioning (trivial later, since every router already uses `APIRouter`) adopted only if/when a genuine breaking change or external consumer arises.
- **Tests:** None (documentation-only).
- **Dependencies:** None.

---

## Suggested phase ordering / what to do first

**Do Phase 7 first, in full, before starting Phase 8.** The security issues (default JWT secret shipped in `docker-compose.yml`, zero role enforcement despite `UserRole` already existing on the model, unguarded concurrent stock writes) are the highest-severity findings and are cheap relative to their risk — most Phase 7 changes are S/M effort. **Phase 8 before Phase 9**: Alembic (Change 8.1) unblocks several later migrations, and Phase 8's background-task work directly sets up Phase 9's state-management fix (Change 9.1 explicitly builds on Change 8.3). **Phase 9 before or interleaved with Phase 10**: trivial items (holiday config, `Literal` type, prediction clipping) and zero-risk cleanup (chatbot removal, legacy HTML) can slot in anywhere. **Phase 10 can interleave with 8/9** since it's mostly frontend-isolated — accessibility and error-handling fixes have no backend dependencies. **Phase 11 last**, since it's new value built on a hardened, paginated, migration-backed base — several items explicitly depend on earlier work (11.6 needs 7.5's RBAC; 11.1/11.9 benefit from 9.5's clipping and 10.3's past-run viewer; 11.3/11.4 depend on 10.6/8.7).

**What not to bother with yet at this scale**: skip a real message broker (Celery/RQ/RabbitMQ) — FastAPI's built-in `BackgroundTasks` (used throughout Phase 8) is sufficient for a single-process app with infrequent, short-running jobs. Skip full URL-based API versioning and PDF export until there's an actual second API consumer or a specific formatted-document requirement — the documentation-only and CSV-only stances in Changes 11.10 and 11.8 cover the realistic near-term need without over-building.
