# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The phased rewrite described in `git log` (Phase 0 → Phase 6) is complete: a working inventory management
app (warehouses, suppliers, products, stock levels + audit trail, low-stock alerts, purchase orders through
receiving) with real per-product/warehouse demand forecasting, a SQLite/SQLAlchemy database, JWT auth, a
React frontend actually wired to the backend, CI, and Docker. `IMPROVEMENT_PLAN.md` (repo root) is a
verified-against-the-code Phase 7–11 roadmap (security hardening → performance → architecture → UX →
new features) picking up from there; Phase 7 (security hardening), Phase 8 (performance & scalability —
Alembic, background tasks for upload/EDA/forecast, N+1 fixes, pagination, FK indexes), Phase 9 (architecture
& code quality), and Phase 10 (UX, accessibility & frontend polish — see below) are done — check `git log`
for what's actually landed. `README.md` is current and is the right starting point for a features/endpoints
overview; this file covers the parts that need multiple files read together to understand.

Everything below was verified by actually running it each phase (pytest, `npm run build`/`test`, and live
`uvicorn`/`npm start` smoke tests against real HTTP requests) rather than only reviewed by eye — see commit
messages for what was specifically caught and fixed that way (a passlib/bcrypt incompatibility, a CRA/axios/
Jest module-resolution issue, an alerts logic bug). If you change something non-trivial, prefer the same:
run it, don't just read it.

## Commands

### Backend (FastAPI, Python — `backend/`)

```bash
cd backend
pip install -r ../requirements.txt
cp .env.example .env   # optional — see config.py for defaults
alembic upgrade head    # create/update the schema — see "Migrations" below

# Run the API (serves on http://127.0.0.1:8000, interactive docs at /docs)
uvicorn main:app --reload

# Run the full test suite
pytest

# Run a single test file / test
pytest tests/test_forecasting.py
pytest tests/test_forecast_api.py::test_forecast_create_and_reread_without_retraining
```

#### Migrations (Alembic)

Schema changes go through Alembic, not `Base.metadata.create_all()` (which only creates *missing* tables,
never alters existing ones). After changing `models.py`:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head    # apply it locally
alembic check            # CI runs this — fails if the models and the latest migration have drifted
```

`env.py` reads the DB URL from `config.settings.database_url` and sets `render_as_batch=True` (required for
SQLite `ALTER TABLE` support). Tests don't use Alembic — `tests/conftest.py`'s `db_session` fixture still
calls `create_all()` against a fresh per-test SQLite file for speed; that's a deliberate, documented
divergence from the real app's migration path, not an oversight.

`backend/pytest.ini` sets `pythonpath = .`, so tests always run as if `backend/` is on `sys.path` —
matches the rest of the codebase, which uses flat imports (`from data_processing import ...`) everywhere,
never relative imports. Run `pytest`/`uvicorn` from inside `backend/`, not the repo root.

### Frontend (Create React App — `frontend/`)

```bash
cd frontend
npm install
cp .env.example .env.local   # optional — defaults to http://127.0.0.1:8000
npm start        # dev server on http://localhost:3000
npm test
npm run build
```

### Docker

`docker compose up --build` from the repo root runs both (backend on :8000, frontend on :3000, SQLite data
in a named volume). Note CRA bakes `REACT_APP_*` vars in at build time — changing `REACT_APP_API_BASE_URL`
requires rebuilding the frontend image, not just restarting the container.

## Architecture

The backend (FastAPI) and frontend (CRA React, `react-router-dom`) are two separate apps that talk to each
other over HTTP/CORS — `frontend/src/api/client.js` reads the backend's base URL from
`REACT_APP_API_BASE_URL` (see `frontend/.env.example`). Pages live in `frontend/src/pages/`, API calls in
`frontend/src/api/`, login state in `frontend/src/context/AuthContext.js` (JWT in `localStorage`).

A CRA + axios 1.7.x + Jest gotcha: axios's conditional `exports` map resolves to an ESM entry under CRA's
bundled Jest config, breaking `react-scripts test` with "Cannot use import statement outside a module".
Fixed via a `jest.moduleNameMapper` override in `frontend/package.json` (no eject needed) pointing `axios`
at its explicit CJS build — don't remove that override without re-verifying `npm test` still passes.

### Backend (`backend/`)

- `main.py` — thin FastAPI app factory: adds CORS middleware, rate-limit state (`rate_limit.py`'s
  `limiter`), includes every router. Does **not** create tables — schema is entirely Alembic's job now (see
  "Migrations" above); a fresh checkout with no DB file needs `alembic upgrade head` before `uvicorn` will
  serve anything but 500s.
- `routers/{auth,upload,forecast,eda,warehouses,suppliers,products,stock,alerts,purchase_orders}.py` — one
  file per resource. Errors are raised as `HTTPException`, not returned as 200-status error dicts. Two
  auth tiers on writes: `require_admin` gates genuinely administrative writes (create/update/deactivate on
  products/warehouses/suppliers, cancelling a PO — see `routers/auth.py`'s docstring for the exact line),
  plain `get_current_user` gates routine staff writes (stock adjustments, PO create/receive, forecasts).
  Reads, upload, and forecast creation stay open to anyone (upload/forecast use `get_current_user_optional`
  just to attribute the action when a token is present). Every `list_*` endpoint returns
  `{items: [...], total: N}` (`schemas.PaginatedResponse[T]`), not a bare array — `skip`/`limit` query
  params, default `limit=50`/max `200`. `purchase_orders.py`'s list endpoint pages over PO **ids** first,
  then `joinedload()`s just that page's `items` — combining `.offset().limit()` directly with a
  one-to-many `joinedload` silently limits joined rows instead of distinct parent entities, a real
  SQLAlchemy footgun, not a hypothetical one. `GET /stock/movements` (`product_id`/`warehouse_id`/
  `start_date`/`end_date` filters, paginated) surfaces the `stock_movements` audit trail that `adjust_stock`
  and `purchase_orders.py`'s `receive_purchase_order` were already writing but nothing previously read back.
- `database.py` / `models.py` / `schemas.py` — SQLAlchemy engine/session (`DATABASE_URL` from
  `config.settings`, defaults to SQLite under `backend/data/`), the full inventory ORM schema (users,
  refresh_tokens, warehouses, suppliers, products, stock_levels, stock_movements, purchase_orders + items,
  sales_records, forecast_runs + predictions, upload_history, alerts), and the matching Pydantic schemas.
  `database.py`'s `engine_kwargs_for(url)` (pure — no `create_engine()` call, so it's testable without the
  target DBAPI driver installed) always sets `pool_pre_ping=True`; `pool_size`/`max_overflow`
  (`config.settings.db_pool_size`/`db_max_overflow`, default 5/10) are added only for a non-SQLite URL —
  SQLite's dialect doesn't accept them, and its "pool" is just a file anyway.
  FK columns (`StockLevel`/`StockMovement`/`PurchaseOrder`/`PurchaseOrderItem`/`Alert`) are indexed —
  added in the Change 8.8 migration once these tables were getting queried by FK in hot paths (alerts
  recompute, stock lookups). Schema changes go through Alembic (`backend/alembic/`) — see "Migrations"
  above; there is no `Base.metadata.create_all()` call left in the app itself. `Product.stock_levels`/
  `Warehouse.stock_levels` are explicit `back_populates` pairs with `StockLevel.product`/`.warehouse` —
  added deliberately, not blanket-applied to every relationship (most stay one-directional; add a pair only
  when something actually needs to traverse it, per `IMPROVEMENT_PLAN.md` Change 9.9's "be conservative").
  `schemas.PurchaseOrderCreate` rejects a payload with the same `product_id` in more than one line item
  (a `@model_validator`, 422) — combine quantities into one line item instead.
- `config.py` — pydantic-settings `Settings` (`.env`-driven: `DATABASE_URL`, `JWT_SECRET_KEY`,
  `environment`, `holiday_country`), plus the `PROCESSED_DATA_PATH`/`DATA_DIR` path constants used by the
  CSV pipeline below.
  `environment="production"` + a still-default `JWT_SECRET_KEY` makes `auth.py` refuse to start
  (`check_production_secret_is_safe`) rather than silently run insecurely.
- `auth.py` / `routers/auth.py` — JWT access tokens (15 min) + opaque refresh tokens (30 days, hashed at
  rest in `refresh_tokens`, exchanged via `POST /auth/refresh`, revoked via `POST /auth/logout`). Hashing
  uses `bcrypt` called directly — **not** `passlib`, which has a known incompatibility with `bcrypt>=4.1`:
  its internal self-test raises on a >72-byte secret since newer bcrypt stopped silently truncating.
  Passwords are capped at 72 bytes in `schemas.py` for the same reason (bcrypt's own hard limit).
  `require_admin` (alongside `get_current_user`/`get_current_user_optional`) implements the RBAC split
  described above. `POST /auth/login` and `/register` are rate-limited (5/min/IP via `rate_limit.py`'s
  shared `slowapi` `Limiter` — tests must call `limiter.reset()` between cases, see `tests/conftest.py`'s
  `_reset_rate_limits` autouse fixture, or state leaks across the whole test session since slowapi's
  default storage is in-process and keyed by client address, not reset per-test on its own).
- `stock_ops.py` — `get_or_create_stock_level` + `stock_level_lock`, shared by `routers/stock.py` and
  `routers/purchase_orders.py`. Two distinct races on one `(product_id, warehouse_id)` pair are handled
  here: two concurrent requests both finding no `stock_levels` row and both trying to `INSERT` one (caught
  via `IntegrityError` + retry — no lock prevents a race on a row that doesn't exist yet), and a
  read-modify-write race on an *existing* row's `quantity_on_hand`. For the second one, `with_for_update()`
  is the real, portable fix — but it's a **documented no-op under SQLite** (this app's default/dev/test/
  Docker-Compose database), which is not hypothetical: a concurrency test firing 20 parallel +1s at one row
  landed only 11 before `stock_level_lock` (an in-process `threading.Lock` keyed by the same pair) was
  added alongside it. Callers must hold `stock_level_lock` from the initial read through `db.commit()`, not
  just around the increment — the write only lands at commit. When re-querying a row already loaded earlier
  in the same session (e.g. `purchase_orders.py`'s `receive_purchase_order`, which reads `po.items` before
  acquiring locks), the re-query needs `.populate_existing()` or SQLAlchemy's identity map silently hands
  back the stale cached object instead of the fresh one — confirmed by the same kind of test failure
  (20 concurrent receipts landing 3) before that was added.
- `features.py` — shared date-feature engineering (year/month/day/weekday/weekend/holiday flag/cyclical
  month encoding), used by both `data_processing.py` (CSV → EDA path) and `forecasting.py` (DB-driven
  forecasting path). Not persisted anywhere — recomputed on demand. Holiday country defaults to
  `config.settings.holiday_country` (`"IN"`), overridable per call. **Two real, previously-silent bugs
  here, both fixed in Phase 9** (found via `tests/test_features.py`, not just code review — the "holidays"
  feature column had likely always evaluated to 0 for every date before this): (1) `holidays`'s
  `HolidayBase` populates lazily per year on first access, and `pandas.Series.isin()` never triggers that
  lazy expansion the way Python's `in` operator does — fixed by eagerly passing `years=` covering the
  dates being engineered; (2) `holidays`' keys are plain `datetime.date` while `dates` is
  datetime64/Timestamp, which `.isin()` treats as never-equal even for the same calendar day — fixed by
  comparing against `dates.dt.date`, not `dates` itself. If you touch this function, keep both fixes; either
  one alone still silently returns 0 for every row.
- `ingest.py` — bridges the legacy `store`/`item` CSV columns into real `Warehouse`/`Product` rows
  (auto-created, `source='legacy_import'`) and upserts into `sales_records`. Idempotent by
  `(date, product, warehouse)` — re-uploading the same file persists 0 new rows. The existence check is a
  single batched query (`SalesRecord.date.in_(...)` against the incoming keys) before the insert loop, not
  a per-row `SELECT` — that was a real N+1 bug, fixed in Phase 8; see `tests/test_ingest.py` for the
  regression test (isolates the fix by re-uploading identical data and asserting zero extra queries, since
  genuinely new rows legitimately need one INSERT each — that part isn't the bug).
- `data_processing.py` — validates an uploaded CSV (`date, store, item, sales` columns required), engineers
  features via `features.py`, and writes the result to `backend/data/processed_data_temp.csv` (gitignored).
  **Only `eda.py` still reads this CSV** — forecasting was rewritten in Phase 5 to query `sales_records` in
  the DB directly instead, scoped to a specific `(product_id, warehouse_id)`. `upload_and_validate_csv`
  returns `(path, validation_summary)`, not just a path — `_validate_rows` rejects (drops) a row only when
  `store`/`item`/`sales` is missing or non-numeric (there's no sane substitute, and `ingest.py`'s
  `int(row.store)` would otherwise raise deep inside a background task for the whole upload over one bad
  row); negative `sales` is flagged as a warning but kept, not rejected — it's ambiguous (could be a return)
  rather than clearly invalid. `validation_summary` (`{total_rows, valid_rows, rejected_rows, warnings}`) is
  persisted on `UploadHistory` and returned immediately in the 202 response, before the background task
  even starts. Raises `ValueError` (→ 400) only if literally every row is rejected.
- `upload_processing.py` — `process_upload_in_background(upload_history_id)`, scheduled via FastAPI
  `BackgroundTasks` from `routers/upload.py` after the request returns 202. Does the actual CSV persistence
  (`ingest.persist_sales_records`) and EDA chart generation, then writes `UploadHistory.status`
  (`processing` → `completed`/`failed`) and `eda_results`/`processed_file_path`. `routers/eda.py` reads the
  cached `eda_results` for a given `upload_id` — no more shared `app.state.data_path` global (the old
  single-tenant stopgap that a second concurrent upload would silently clobber).
- `forecasting.py` — `create_pending_forecast_run()` creates the `ForecastRun` row (`status="pending"`) and
  returns immediately (fast-failing on insufficient history via a count query, before scheduling anything);
  `run_forecast_training_in_background(run_id)` is scheduled via `BackgroundTasks` from `routers/forecast.py`
  and does the actual training. Trains on all `sales_records` history for the pair and predicts
  `forecast_horizon` genuine future calendar days (not a backtest — that was the pre-Phase-5 bug:
  predictions on a historical held-out split, mislabeled as a forecast). `ModelType` (a `Literal["moving_
  average", "random_forest", "exponential_smoothing"]`) is the single source of truth for the three
  supported types — `schemas.ForecastRequest.model_type` is typed with the same alias, so an unknown value
  is a 422 from Pydantic before this module is ever reached, not the runtime `ValueError` direct/
  programmatic callers (tests, scripts) still get from `_validate_forecast_params`. Every prediction is
  clipped to `>= 0` before being persisted (`max(0.0, float(predicted_sales))`) — none of the three models
  enforce that on their own; a declining trend can genuinely extrapolate negative. Raises
  `InsufficientHistoryError` under `MIN_HISTORY_ROWS` (10). Models persist via `joblib` to
  `backend/data/models/{run_id}.joblib` (gitignored; `moving_average` has no model object, so none is
  written); rereading a run via `GET /forecast/{id}` must not touch that file's mtime — if it does,
  something is retraining on read, which defeats the point of persisting the model. **Background-task
  callbacks (here and in `upload_processing.py`) must open their own DB session via `import database` +
  `database.SessionLocal()`** (module-qualified, not `from database import SessionLocal`) — a frozen
  import captures the production engine at import time, invisible to `tests/conftest.py`'s per-test
  session override, and the request's own session may already be closed by the time a background task
  actually runs.
  - `exponential_smoothing` reindexes to a continuous daily series (`asfreq("D")`), which introduces NaN
    for any date with no `sales_records` row at all (this app's data has no explicit zero-sales rows, only
    gaps). `gap_fill_strategy` (`schemas.ForecastRequest`, persisted on `ForecastRun.params`) controls how
    those gaps are handled: `"zero"` (default — a gap means nothing sold, the more defensible retail
    assumption) or `"interpolate"` (the old, always-on behavior — fabricates values across the gap via
    linear interpolation, which can make a real stockout read as smoothed positive sales; kept as an
    explicit opt-in, not removed).
  - `random_forest` trains on `lag_1`, `lag_7`, `rolling_mean_7`, `rolling_mean_28` in addition to the
    plain date features (see `_build_lag_rolling_features`). `lag_1`/`lag_7` are real values only — rows
    without one yet are dropped, never fabricated — but the rolling means use `min_periods=1` (a real,
    if noisier, average of however many prior days exist) rather than requiring a full 28-day warm-up,
    which would conflict with `MIN_HISTORY_ROWS=10` and make this model type effectively unusable for most
    of this app's realistic history lengths — a deliberate deviation from a literal 28-day rolling window,
    not an oversight (see `tests/test_forecasting.py::test_random_forest_trains_at_the_min_history_rows_
    floor`). Forecasting multiple days ahead is recursive (`_predict_future_with_lags`): each day's own
    prediction becomes the lag/rolling basis for the days after it, since there's no real "actual" once
    you're past the last known day.
- `eda.py` — renders matplotlib/seaborn charts server-side to base64 PNGs, called from
  `upload_processing.py`'s background task rather than inline in the request handler. Must keep
  `matplotlib.use("Agg")` at import time and never call `plt.show()` — an interactive backend will
  hang/error when it's not running on a display thread.
- `tests/conftest.py` — the `db_session` fixture overrides `get_db` with an isolated per-test SQLite file
  **and** monkeypatches `database.SessionLocal` to the same test session factory, so background-task code
  that opens its own session (see above) also lands in the test DB. Also has a `_reset_rate_limits`
  autouse fixture (slowapi's limiter state is in-process and doesn't reset itself between tests) and a
  `promote_to_admin(session_factory, email)` helper for tests that need an admin-role user.

### Frontend (`frontend/`)

- `src/App.js` — `AuthProvider` + `BrowserRouter` + routes to every page below.
- `src/api/*.js` — one thin module per backend resource, all funneled through `client.js`'s shared axios
  instance (base URL + auth-header interceptor).
- `src/context/AuthContext.js` — access + refresh tokens in `localStorage`; on mount, if a token exists,
  calls `GET /auth/me` to resolve the user (clears tokens if that fails). No route requires login to
  *view* — write actions (add/edit/deactivate/adjust) conditionally render based on `useAuth().user`,
  matching the backend's write-gating (note: the frontend doesn't yet distinguish admin vs. staff `role`
  for which write actions to show — a plain-staff user can still see e.g. the "Add warehouse" form and
  will get a 403 from the backend on submit).
- `src/api/client.js` — on a 401, attempts exactly one silent refresh-and-retry of the original request
  before giving up and clearing stored auth via `AuthContext`'s registered `setSessionExpiredHandler`
  (module-level callback, not a direct import, to avoid a circular import between the two). `/auth/*`
  requests themselves are never retried this way. See `client.test.js` for the mocking pattern needed to
  test this (`jest.doMock('axios', ...)` + `jest.resetModules()` per test — a top-level `jest.mock('axios')`
  automock doesn't correctly shape axios's callable-function export).
- `src/pages/*.js` — `DashboardPage`, `UploadPage`, `ForecastPage`, `EdaPage`, `WarehousesPage`,
  `SuppliersPage`, `ProductsPage`, `StockPage`, `StockMovementsPage`, `AlertsPage`, `PurchaseOrdersPage` +
  `PurchaseOrderDetailPage` (`/purchase-orders/:id`), `LoginPage`, `RegisterPage`. The 7 list pages
  (`Warehouses`/`Suppliers`/`Products`/`Stock`/`StockMovements`/`Alerts`/`PurchaseOrders`) all use the shared
  `usePaginatedList` hook (`src/hooks/usePaginatedList.js`) + `LoadMoreButton` component to consume the
  backend's `{items, total}` paginated responses — `reload()` for "refetch from scratch" (after a
  create/update), `loadMore()` to append the next page. The 3 CRUD pages (`Warehouses`/`Suppliers`/
  `Products`) share one more pattern: an `editingId` state that switches the same inline-form into edit
  mode (pre-filled, submit calls `updateX(id, payload)` instead of `createX(payload)`, submit button reads
  "Save changes", a "Cancel edit" button appears) — added in Change 10.3 to actually use the
  `updateProduct`/`updateWarehouse`/`updateSupplier` API functions, which existed and were tested at the
  backend but had no frontend caller before. `ForecastPage` similarly wires up `getForecastRun`/
  `listForecastRuns`: a "Past runs" list (filtered to the selected product/warehouse) lets you re-view an
  earlier run's predictions via `getForecastRun` (which re-reads without retraining) instead of only ever
  seeing the most recent submission's result. Each CRUD page's `handleDeactivate` is wrapped in try/catch
  (Change 10.1) — it wasn't, before, so a failed deactivation (e.g. a 403 once Phase 7's RBAC landed) was an
  unhandled promise rejection with no user-visible error.
- `src/components/` — `Navbar`, `FileUploadForm`, `ForecastChart` (chart.js; predictions are
  `{forecast_date, predicted_sales}` pairs, not bare numbers), `EdaCharts` (renders the backend's base64
  PNGs via `<img>`), `DataTable` (generic — pass `columns`/`rows`, used by every CRUD page),
  `LoadMoreButton` (the "Showing X of Y" + optional "Load more" control paired with `usePaginatedList`),
  `StockAdjustModal`, `POForm`. Dropdown data (e.g. the warehouse `<select>` in `StockAdjustModal`/`POForm`)
  fetches the paginated list APIs with `{ limit: 200 }` and unwraps `.items` directly — a one-off,
  non-paginated read, not wired through `usePaginatedList`, since these are populating a `<select>`, not
  rendering the page's primary list. `StockAdjustModal` has `role="dialog"`/`aria-modal="true"`/
  `aria-labelledby`, closes on Escape, and manually traps Tab/Shift+Tab within its handful of focusable
  elements (Change 10.5) — see `StockAdjustModal.test.js` for the pattern if extending this to another
  modal. The 3 CRUD pages' inline-form inputs each have a real `<label htmlFor>` (visually hidden via the
  `.sr-only` class in `App.css`, since a visible label breaks their compact horizontal `inline-form` layout
  — `placeholder` stays as the visible hint) rather than only a bare `placeholder` (Change 10.4).
- Pages that fetch on mount need their API module mocked in tests (`jest.mock('../api/products')` etc.) —
  see `src/pages/ProductsPage.test.js` for the pattern. Without it, the test hits the real
  `REACT_APP_API_BASE_URL` and hangs/fails in CI, where no backend is running. To simulate a logged-in user
  (needed to test write actions like Edit/Deactivate, which only render for `useAuth().user`), seed
  `localStorage.setItem('accessToken', ...)` before rendering and mock `api/auth`'s `getCurrentUser` to
  resolve a user — see `ProductsPage.test.js`'s `renderPageLoggedIn()` helper.
