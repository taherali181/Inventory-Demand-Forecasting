# Inventory Demand Forecasting

A FastAPI + React inventory management app: track warehouses, suppliers, products, and stock levels; get
low-stock alerts; run purchase orders through receiving; and forecast future demand per product/warehouse
from real sales history (RandomForest, exponential smoothing, or a moving-average baseline).

It started as a small sales-forecasting prototype (a CSV of `date, store, item, sales` in, a
RandomForest-based prediction out) and has been rebuilt in phases into the app described here — see `git
log` and `CLAUDE.md` for how it got here and what's still in progress.

## Features

- **Inventory CRUD** — warehouses, suppliers, products (with reorder point/safety stock/reorder quantity),
  and per-warehouse stock levels with a full audit trail of every adjustment.
- **Low-stock alerts** — compares available stock against each product's reorder point and opens/resolves
  alerts accordingly.
- **Purchase orders** — draft → submitted → approved → (partially) received, with partial receiving that
  updates stock and the audit trail.
- **Forecasting** — trains on a product/warehouse's real sales history and predicts real future days ahead
  (not a backtest). Three interchangeable models: RandomForest, exponential smoothing, or a moving-average
  baseline. Trained models and results persist, so re-fetching a forecast doesn't retrain it.
- **Legacy CSV import** — the original `date, store, item, sales` CSV format still works: uploading one
  auto-creates the corresponding warehouses/products and feeds both EDA (charts + summary stats) and the
  sales history forecasting trains on.
- **Auth** — JWT-based; reads are open, writes require an account. Optional in the sense that nothing
  breaks if you never log in on a single-user setup — you just can't create/edit/delete records.

## Project layout

```
backend/            FastAPI app (see CLAUDE.md for the full module-by-module breakdown)
  routers/          One file per resource: auth, upload, forecast, eda, warehouses,
                     suppliers, products, stock, alerts, purchase_orders
  models.py          SQLAlchemy ORM schema
  forecasting.py      Model training/prediction (Phase 5 rewrite — real future forecasts)
  tests/
frontend/           Create React App + react-router-dom
  src/api/            One module per backend resource
  src/pages/          One page per route
  src/components/
```

## Running locally

### Backend

```bash
cd backend
pip install -r ../requirements.txt
cp .env.example .env   # optional — sane defaults work without it
uvicorn main:app --reload
```

API docs: http://127.0.0.1:8000/docs. Tests: `pytest` (run from `backend/`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # optional — defaults to http://127.0.0.1:8000
npm start
```

Opens at http://localhost:3000. Tests: `npm test`. Build: `npm run build`.

### Docker

```bash
docker compose up --build
```

Backend on :8000, frontend on :3000. SQLite data persists in a named volume across restarts.

## Configuration

Backend config is `.env`-driven (see `backend/.env.example`): `DATABASE_URL` (SQLite by default, any
SQLAlchemy-supported URL works — e.g. Postgres) and `JWT_SECRET_KEY` (**must** be overridden to a real
secret outside local development). Frontend config is `frontend/.env.example`:
`REACT_APP_API_BASE_URL`, read at build/start time (CRA doesn't support runtime env vars).

## API overview

All endpoints are documented interactively at `/docs`. Broad strokes:

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Upload/EDA | `POST /upload`, `GET /eda` |
| Inventory | `GET/POST/PUT/DELETE /warehouses`, `/suppliers`, `/products`; `GET /stock`, `POST /stock/adjust` |
| Alerts | `GET /alerts`, `POST /alerts/recompute` |
| Purchase orders | `GET/POST /purchase-orders`, `PUT /purchase-orders/{id}/status`, `POST /purchase-orders/{id}/receive` |
| Forecast | `POST /forecast`, `GET /forecast`, `GET /forecast/{id}` |
| Chatbot | `GET /chatbot/chat/{user_input}` (rule-based, no LLM) |

## License

MIT.
