# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The phased rewrite described in `git log` (Phase 0 → Phase 6) is complete: this is now a working inventory
management app (warehouses, suppliers, products, stock levels + audit trail, low-stock alerts, purchase
orders through receiving) with real per-product/warehouse demand forecasting, a SQLite/SQLAlchemy database,
JWT auth, a React frontend actually wired to the backend, CI, and Docker. `README.md` is current and is the
right starting point for a features/endpoints overview; this file covers the parts that need multiple files
read together to understand.

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

# Run the API (serves on http://127.0.0.1:8000, interactive docs at /docs)
uvicorn main:app --reload

# Run the full test suite
pytest

# Run a single test file / test
pytest tests/test_forecasting.py
pytest tests/test_forecast_api.py::test_forecast_create_and_reread_without_retraining
```

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

- `main.py` — thin FastAPI app factory: adds CORS middleware, calls `Base.metadata.create_all()` (see
  below), includes every router, mounts `chatbot.py` as a sub-app at `/chatbot`.
- `routers/{auth,upload,forecast,eda,warehouses,suppliers,products,stock,alerts,purchase_orders}.py` — one
  file per resource. Errors are raised as `HTTPException`, not returned as 200-status error dicts. Auth
  gates writes (POST/PUT/DELETE) on the inventory/purchasing routers via `get_current_user`; reads, upload,
  and forecast stay open (upload/forecast use `get_current_user_optional` just to attribute the action when
  a token is present).
- `database.py` / `models.py` / `schemas.py` — SQLAlchemy engine/session (`DATABASE_URL` from
  `config.settings`, defaults to SQLite under `backend/data/`), the full inventory ORM schema (users,
  warehouses, suppliers, products, stock_levels, stock_movements, purchase_orders + items, sales_records,
  forecast_runs + predictions, upload_history, alerts), and the matching Pydantic schemas. **No Alembic** —
  `Base.metadata.create_all()` in `main.py` creates missing tables on every startup; this doesn't handle
  schema changes to *existing* tables, so introduce Alembic before that's needed.
- `config.py` — pydantic-settings `Settings` (`.env`-driven: `DATABASE_URL`, `JWT_SECRET_KEY`), plus the
  `PROCESSED_DATA_PATH`/`DATA_DIR` path constants used by the CSV pipeline below.
- `auth.py` / `routers/auth.py` — JWT auth (PyJWT + `bcrypt` called directly — **not** `passlib`, which has
  a known incompatibility with `bcrypt>=4.1`: its internal self-test raises on a >72-byte secret since
  newer bcrypt stopped silently truncating). Passwords are capped at 72 bytes in `schemas.py` for the same
  reason (bcrypt's own hard limit).
- `features.py` — shared date-feature engineering (year/month/day/weekday/weekend/India-holiday
  flag/cyclical month encoding), used by both `data_processing.py` (CSV → EDA path) and `forecasting.py`
  (DB-driven forecasting path). Not persisted anywhere — recomputed on demand.
- `ingest.py` — bridges the legacy `store`/`item` CSV columns into real `Warehouse`/`Product` rows
  (auto-created, `source='legacy_import'`) and upserts into `sales_records`. Idempotent by
  `(date, product, warehouse)` — re-uploading the same file persists 0 new rows.
- `data_processing.py` — validates an uploaded CSV (`date, store, item, sales` columns required), engineers
  features via `features.py`, and writes the result to `backend/data/processed_data_temp.csv` (gitignored).
  **Only `eda.py` still reads this CSV** — forecasting was rewritten in Phase 5 to query `sales_records` in
  the DB directly instead, scoped to a specific `(product_id, warehouse_id)`. `/upload` writes both: the DB
  (source of truth for inventory and for forecasting) and this CSV snapshot (source of truth for EDA only).
- `forecasting.py` — `create_forecast_run(db, product_id, warehouse_id, model_type, forecast_horizon)`
  trains on all `sales_records` history for that pair and predicts `forecast_horizon` genuine future
  calendar days (not a backtest — that was the pre-Phase-5 bug: predictions on a historical held-out split,
  mislabeled as a forecast). Three `model_type`s: `random_forest`, `exponential_smoothing` (statsmodels),
  `moving_average`. Raises `InsufficientHistoryError` under `MIN_HISTORY_ROWS` (10). Models persist via
  `joblib` to `backend/data/models/{run_id}.joblib` (gitignored; `moving_average` has no model object, so
  none is written); rereading a run via `GET /forecast/{id}` must not touch that file's mtime — if it does,
  something is retraining on read, which defeats the point of persisting the model.
- `eda.py` — renders matplotlib/seaborn charts server-side to base64 PNGs. Must keep
  `matplotlib.use("Agg")` at import time and never call `plt.show()` — this code runs inside a request
  handler, and an interactive backend will hang/error under `uvicorn`.
- `chatbot.py` — a separate, minimal `FastAPI()` app mounted into `main.py`. Purely rule-based (a 3-entry
  dict keyed on exact lowercase string match), no LLM involved.
- `tests/conftest.py` — the `db_session` fixture overrides `get_db` with an isolated per-test SQLite file;
  any test that exercises the app through `TestClient` and touches the DB (directly or via `/upload`) needs
  it, or it'll hit the real `backend/data/inventory.db`.

### Frontend (`frontend/`)

- `src/App.js` — `AuthProvider` + `BrowserRouter` + routes to every page below.
- `src/api/*.js` — one thin module per backend resource, all funneled through `client.js`'s shared axios
  instance (base URL + auth-header interceptor).
- `src/context/AuthContext.js` — JWT in `localStorage`; on mount, if a token exists, calls `GET /auth/me`
  to resolve the user (clears the token if that fails). No route requires login to *view* — write actions
  (add/edit/deactivate/adjust) conditionally render based on `useAuth().user`, matching the backend's
  write-gating.
- `src/pages/*.js` — `DashboardPage`, `UploadPage`, `ForecastPage`, `EdaPage`, `WarehousesPage`,
  `SuppliersPage`, `ProductsPage`, `StockPage`, `AlertsPage`, `PurchaseOrdersPage` +
  `PurchaseOrderDetailPage` (`/purchase-orders/:id`), `LoginPage`, `RegisterPage`.
- `src/components/` — `Navbar`, `FileUploadForm`, `ForecastChart` (chart.js; predictions are
  `{forecast_date, predicted_sales}` pairs, not bare numbers), `EdaCharts` (renders the backend's base64
  PNGs via `<img>`), `DataTable` (generic — pass `columns`/`rows`, used by every CRUD page),
  `StockAdjustModal`, `POForm`.
- Pages that fetch on mount need their API module mocked in tests (`jest.mock('../api/products')` etc.) —
  see `src/pages/ProductsPage.test.js` for the pattern. Without it, the test hits the real
  `REACT_APP_API_BASE_URL` and hangs/fails in CI, where no backend is running.
