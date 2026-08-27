---
name: run-inventory-app
description: Launch and drive this app (FastAPI backend + CRA frontend) for manual testing. Use when asked to run, start, or smoke-test the Inventory Demand Forecasting app, or to confirm a change works end-to-end (not just pytest/npm test).
---

# Run: Inventory Demand Forecasting

Two separate apps talking over HTTP/CORS: FastAPI backend (`backend/`, port 8000) and
CRA React frontend (`frontend/`, port 3000). Both must be running to test anything through the UI;
the backend alone is enough to test via `curl`/`/docs`.

## Check first: are deps already installed?

```bash
python3 -c "import fastapi" 2>&1 && echo "backend deps OK" || echo "NEED INSTALL"
[ -d frontend/node_modules ] && echo "frontend deps OK" || echo "NEED npm install"
```

If both say OK, skip straight to **Run**. Installed Python packages and `node_modules` persist across
turns in the same container/session but not across a fresh container — redo setup if `NEED INSTALL`.

## One-time setup (only if `NEED INSTALL`)

**Known environment gotcha**: this box's system Python (3.14 as of writing) ships with no `pip`, no
working `venv` (ensurepip is missing and `apt install python3.14-venv` needs sudo that isn't
passwordless), and no C compiler (`cc`/`gcc`/`clang` all absent). `requirements.txt` pins older
package versions (pandas 2.2.2, numpy 1.26.4, etc.) that have no prebuilt wheel for such a new
CPython, so a plain `pip install -r requirements.txt` fails trying to build pandas from source and
dies on the missing compiler. Work around it by bootstrapping `pip` directly and installing **latest,
unpinned** versions of the heavy packages instead of the exact pins — newer pandas/numpy/scikit-learn/
matplotlib/statsmodels all ship prebuilt wheels for new CPython versions:

```bash
python3 -c "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py', '/tmp/get-pip.py')"
python3 /tmp/get-pip.py --user --break-system-packages
python3 -m pip install --user --break-system-packages \
  fastapi "uvicorn[standard]" pandas numpy scikit-learn matplotlib seaborn holidays python-multipart \
  statsmodels joblib sqlalchemy pydantic-settings pyjwt bcrypt email-validator pytest httpx
```

If this machine *does* have a working `venv`/compiler (check `python3 -m venv --help` and
`which gcc`), prefer the normal documented path instead — a real venv with the exact pinned
`requirements.txt` versions:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r ../requirements.txt
```

After installing either way, sanity-check with the test suite (from `backend/`): `pytest -q`.
Last verified 2026-08-27: 29/29 passed against unpinned latest versions (fastapi 0.141.1, pandas
3.0.5, numpy 2.5.2, scikit-learn 1.9.0, statsmodels 0.14.6).

Frontend: `cd frontend && npm install` (only needed if `node_modules` is missing).

Env files (create once per checkout, harmless to skip if already present):

```bash
cd backend && [ -f .env ] || cp .env.example .env
cd ../frontend && [ -f .env.local ] || cp .env.example .env.local
```

## Run

Background-launch both (they must stay up while you test):

```bash
cd backend
nohup python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 > /tmp/inventory-backend.log 2>&1 &
disown
BACKEND_PID=$!

cd ../frontend
BROWSER=none nohup npm start > /tmp/inventory-frontend.log 2>&1 &
disown
FRONTEND_PID=$!
```

## Verify

```bash
# Backend: wait for it, then hit a real route
for i in $(seq 1 20); do curl -sf http://127.0.0.1:8000/docs > /dev/null && break; sleep 0.5; done
curl -sL http://127.0.0.1:8000/warehouses   # -> [] on a fresh DB, or a JSON array

# Frontend: CRA's dev server takes longer to compile
for i in $(seq 1 30); do curl -sf http://localhost:3000 > /dev/null && break; sleep 1; done
curl -s http://localhost:3000 | grep -o '<title>[^<]*</title>'
```

`GET /docs` (interactive Swagger UI) is the quickest backend health check. For the frontend, "ready"
is `webpack compiled successfully` in `/tmp/inventory-frontend.log`.

No login is needed to view data (GET routes are open). Register a user at
`http://localhost:3000/register` (or `POST /auth/register`) to test write actions — the backend gates
POST/PUT/DELETE on warehouses/suppliers/products/stock/purchase-orders behind auth.

## Stop

```bash
lsof -ti:8000 -sTCP:LISTEN | xargs -r kill
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

(Prefer the port over `pkill -f uvicorn`/`pkill -f react-scripts` — broad patterns risk matching an
unrelated process in a shared session.)

## Environment

| Variable | Where | Required | Default | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | `backend/.env` | No | SQLite under `backend/data/` | see `backend/config.py` |
| `JWT_SECRET_KEY` | `backend/.env` | No | dev default in `config.py` | fine for local testing |
| `REACT_APP_API_BASE_URL` | `frontend/.env.local` | No | `http://127.0.0.1:8000` | CRA bakes this in at start/build time — no runtime reload |

## Docker alternative

`docker compose up --build` from the repo root runs both (backend :8000, frontend :3000, SQLite in a
named volume) without touching this machine's Python at all — worth using instead of the above if
Docker is available and the pip workaround feels too fragile.
