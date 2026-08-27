# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is mid-rewrite: an early sales-forecasting prototype (CSV → RandomForest) being expanded into a
real inventory-management app (SKUs, stock levels, reorder points, suppliers, warehouses, purchase orders)
with a working database and frontend. Check `git log` and in-code `# NOTE:` / "Phase N" comments (e.g. in
`backend/main.py`, `backend/forecasting.py`) for what's actually landed vs. still planned — don't assume
features described below as "not yet built" have stayed that way.

**`README.md` is stale** relative to the current code (it describes an earlier version of the API/frontend)
— treat the source, not the README, as ground truth until it's rewritten.

## Commands

### Backend (FastAPI, Python — `backend/`)

```bash
cd backend
pip install -r ../requirements.txt

# Run the API (serves on http://127.0.0.1:8000, interactive docs at /docs)
uvicorn main:app --reload

# Run the full test suite
pytest

# Run a single test file / test
pytest tests/test_forecasting.py
pytest tests/test_api.py::test_upload_then_forecast_and_eda
```

`backend/pytest.ini` sets `pythonpath = .`, so tests always run as if `backend/` is on `sys.path` —
matches the rest of the codebase, which uses flat imports (`from data_processing import ...`) everywhere,
never relative imports. Run `pytest`/`uvicorn` from inside `backend/`, not the repo root.

### Frontend (Create React App — `frontend/`)

```bash
cd frontend
npm install
npm start        # dev server on http://localhost:3000
npm test
npm run build
```

## Architecture

The backend (FastAPI) and frontend (CRA React, `react-router-dom`) are two separate apps, run separately
(`uvicorn` on :8000, `npm start` on :3000) and talk to each other over HTTP/CORS —
`frontend/src/api/client.js` reads the backend's base URL from `REACT_APP_API_BASE_URL` (see
`frontend/.env.example`). Pages live in `frontend/src/pages/`, API calls in `frontend/src/api/`, and login
state in `frontend/src/context/AuthContext.js` (JWT stored in `localStorage`).

A CRA + axios 1.7.x + Jest gotcha: axios's conditional `exports` map resolves to an ESM entry under CRA's
bundled Jest config, breaking `react-scripts test` with "Cannot use import statement outside a module".
Fixed via a `jest.moduleNameMapper` override in `frontend/package.json` (no eject needed) pointing `axios`
at its explicit CJS build — don't remove that override without re-verifying `npm test` still passes.

### Backend (`backend/`)

- `main.py` — thin FastAPI app factory: adds CORS middleware, calls `Base.metadata.create_all()` (see
  below), sets `app.state.data_path` (path to the currently-uploaded CSV snapshot), includes the routers
  below, and mounts `chatbot.py` as a sub-app at `/chatbot`.
- `routers/{auth,upload,forecast,eda}.py` — the actual endpoints. Errors are raised as `HTTPException`, not
  returned as 200-status error dicts.
- `database.py` / `models.py` / `schemas.py` — SQLAlchemy engine/session (`DATABASE_URL` env-driven,
  defaults to SQLite under `backend/data/`), the full inventory-management ORM schema (users, warehouses,
  suppliers, products, stock_levels, stock_movements, purchase_orders, sales_records, forecast_runs,
  upload_history, alerts — most tables aren't wired to a router yet), and the Pydantic schemas that
  actually have endpoints (currently just auth). **No Alembic yet** — `Base.metadata.create_all()` in
  `main.py` creates missing tables on every startup; this doesn't handle schema changes to existing tables,
  so introduce Alembic before the schema needs to change without losing data.
- `auth.py` / `routers/auth.py` — JWT auth (PyJWT + `bcrypt` called directly — **not** `passlib`, which has
  a known incompatibility with `bcrypt>=4.1`: its internal self-test raises on a >72-byte secret since
  newer bcrypt stopped silently truncating). `get_current_user`/`get_current_user_optional` dependencies
  exist but aren't enforced on any endpoint yet — `/upload` uses the optional variant just to attribute
  uploads when a token is present.
- `ingest.py` — bridges the legacy `store`/`item` CSV columns into real `Warehouse`/`Product` rows
  (auto-created, `source='legacy_import'`) and upserts into `sales_records`. Idempotent by
  `(date, product, warehouse)` — re-uploading the same file persists 0 new rows.
- `config.py` — path constants (`PROCESSED_DATA_PATH`, `DATA_DIR`) and CORS-allowed origins.
- `data_processing.py` — validates an uploaded CSV (`date, store, item, sales` columns required),
  engineers forecasting features (weekday, weekend flag, India-holiday flag via the `holidays` lib,
  cyclical month encoding), and writes the result to `backend/data/processed_data_temp.csv` (gitignored).
  **This file-based pipeline is still what `forecasting.py`/`eda.py` read from** — `/upload` writes to both
  the DB (source of truth for inventory) and this CSV snapshot (source of truth for forecast/EDA) until
  forecasting.py is rewritten to query the DB directly.
- `forecasting.py` — `moving_average_forecast()` (simple rolling mean) and `advanced_forecasting()`
  (`RandomForestRegressor`, retrained from scratch on every call). `advanced_forecasting` currently
  backtests on a historical train/test split rather than predicting real future dates — the
  `forecast_horizon` query param is accepted but not yet load-bearing.
- `eda.py` — renders matplotlib/seaborn charts server-side to base64 PNGs. Must keep
  `matplotlib.use("Agg")` at import time and never call `plt.show()` — this code runs inside a request
  handler, and an interactive backend will hang/error under `uvicorn`.
- `chatbot.py` — a separate, minimal `FastAPI()` app mounted into `main.py`. Purely rule-based (a 3-entry
  dict keyed on exact lowercase string match), no LLM involved.
- `tests/conftest.py` — the `db_session` fixture overrides `get_db` with an isolated per-test SQLite file;
  any test that exercises the app through `TestClient` and touches the DB (directly or via `/upload`) needs
  it, or it'll hit the real `backend/data/inventory.db`.

### Frontend (`frontend/`)

- `src/App.js` — sets up `AuthProvider` + `BrowserRouter` + routes to the pages below; this is the actual
  application (not CRA boilerplate).
- `src/api/*.js` — one thin module per backend concern (`client.js` holds the shared axios instance +
  `REACT_APP_API_BASE_URL` + auth-header interceptor; `auth.js`/`upload.js`/`forecast.js`/`eda.js` wrap the
  corresponding endpoints).
- `src/context/AuthContext.js` — JWT stored in `localStorage`; on mount, if a token exists, calls
  `GET /auth/me` to resolve the user (and clears the token if that fails).
- `src/pages/*.js` — `DashboardPage`, `UploadPage`, `ForecastPage`, `EdaPage`, `LoginPage`, `RegisterPage`.
  None of the app's routes require login — the backend doesn't enforce auth on upload/forecast/eda yet, so
  logging in only attributes uploads to your account rather than gating access.
- `src/components/{Navbar,FileUploadForm,ForecastChart,EdaCharts}.js` — shared UI; `ForecastChart` uses
  chart.js/react-chartjs-2, `EdaCharts` renders the backend's base64 PNGs directly via `<img>`.
