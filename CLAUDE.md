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

The backend and frontend are two independent apps that are **not currently wired together**:

- `frontend/src/App.js` is still unmodified Create React App boilerplate — it renders the default CRA
  landing page, not the actual application.
- `frontend/src/FileUpload.js` is a real component but is never imported/rendered by `App.js`, and it posts
  to a backend endpoint (`/perform_eda/`) that no longer exists.
- The only frontend that actually talks to the backend today is the static Bootstrap page at
  `backend/frontend/index.html`, served by the backend itself at `GET /`.

### Backend (`backend/`)

- `main.py` — thin FastAPI app factory: adds CORS middleware, sets `app.state.data_path` (path to the
  currently-uploaded dataset — a single-tenant, in-process stand-in for a database), includes the routers
  below, and mounts `chatbot.py` as a sub-app at `/chatbot`.
- `routers/{upload,forecast,eda}.py` — the actual endpoints (`POST /upload`, `GET /forecast`,
  `GET /eda`). Errors are raised as `HTTPException`, not returned as 200-status error dicts.
- `config.py` — path constants (`PROCESSED_DATA_PATH`, etc.) and CORS-allowed origins.
- `data_processing.py` — validates an uploaded CSV (`date, store, item, sales` columns required),
  engineers forecasting features (weekday, weekend flag, India-holiday flag via the `holidays` lib,
  cyclical month encoding), and writes the result to a single shared file,
  `backend/data/processed_data_temp.csv` (gitignored, overwritten on every upload — there is no database
  or per-user storage yet).
- `forecasting.py` — `moving_average_forecast()` (simple rolling mean) and `advanced_forecasting()`
  (`RandomForestRegressor`, retrained from scratch on every call). `advanced_forecasting` currently
  backtests on a historical train/test split rather than predicting real future dates — the
  `forecast_horizon` query param is accepted but not yet load-bearing.
- `eda.py` — renders matplotlib/seaborn charts server-side to base64 PNGs. Must keep
  `matplotlib.use("Agg")` at import time and never call `plt.show()` — this code runs inside a request
  handler, and an interactive backend will hang/error under `uvicorn`.
- `chatbot.py` — a separate, minimal `FastAPI()` app mounted into `main.py`. Purely rule-based (a 3-entry
  dict keyed on exact lowercase string match), no LLM involved.

There is no database, no authentication, and no multi-user support yet — everything is single-process,
single-tenant, file-based state via `app.state`.
