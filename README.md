<div align="center">

# Restock

**The Modern AI-Powered Inventory & Demand Forecasting Operating System**

[![CI / Build Status](https://img.shields.io/badge/build-passing-22c55e?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/taherali181/restock)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![Tests](https://img.shields.io/badge/Tests-99%20Backend-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <a href="#-quickstart-in-60-seconds">⚡ Quickstart</a> •
  <a href="#-why-restock">💡 Why Restock?</a> •
  <a href="#-the-dual-canvas-experience">✨ Dual-Canvas UX</a> •
  <a href="#-interactive-copilot--generative-ui">🤖 AI Copilot</a> •
  <a href="#-context-studio-workspaces">📊 Studio Workspaces</a> •
  <a href="#-multi-model-demand-forecasting-engine">📈 ML Forecasting</a> •
  <a href="#-concurrency-reliability--data-integrity">🛡️ Concurrency & Reliability</a> •
  <a href="#-api-reference">🔌 API Reference</a> •
  <a href="#-database-schema">🗄️ Database Schema</a>
</p>

</div>

---

```
   ____           __             __  
  / __ \___  ___ / /____  ____  / /__
 / /_/ / _ \(_-</ __/ _ \/ __/ /  '_/
/_/ \_\___/___/\__/\___/\__/  /_/\_\ 
  Autonomous Supply Chain Intelligence • Dual-Canvas Workspace • Predictive ML
```

**Restock** is a production-grade, AI-first inventory operating system built for modern supply chain and operations teams. It seamlessly fuses **conversational AI intelligence** with a **high-density interactive studio workspace**—eliminating stockouts, predicting future demand with multi-model machine learning, and automating procurement workflows from low-stock triage to atomic warehouse receiving.

> [!TIP]
> **Instant Demo Access**: Launch with Docker Compose in 60 seconds. An administrator demo account (`admin@restock.io` / `Password123!`) is available out of the box.

---

## ⚡ Quickstart in 60 Seconds

### Demo Credentials

| Field | Demo Value |
| :--- | :--- |
| **Email** | `admin@restock.io` |
| **Password** | `Password123!` |
| **Role** | System Administrator (`admin`) |

---

### Option A: Docker Compose (Recommended)

Run the complete multi-tier system (FastAPI backend + React frontend + persistent SQLite volume) with a single command:

```bash
# Clone the repository
git clone https://github.com/taherali181/restock.git
cd restock

# Launch all containers
docker compose up --build
```

- **Frontend (chat + canvas shell)**: [http://localhost:3000](http://localhost:3000)
- **Interactive Backend Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus Telemetry Metrics**: [http://localhost:8000/metrics](http://localhost:8000/metrics)

---

### Option B: Local Developer Setup

#### 1. Backend Setup (FastAPI & Python 3.11+)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Configure environment & apply Alembic migrations
cp .env.example .env
alembic upgrade head

# Run FastAPI server with auto-reload
uvicorn main:app --reload --port 8000
```

#### 2. Frontend Setup (Vite + React 19 + TypeScript & Tailwind CSS)

```bash
cd frontend

# Install dependencies
npm install

# Configure local environment (defaults to http://127.0.0.1:8000)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💡 Why Restock?

Traditional Enterprise Resource Planning (ERP) and inventory management tools force supply chain operators to navigate fragmented menus, manually compute reorders in error-prone spreadsheets, and guess future demand with crude averages.

Restock replaces static CRUD forms with a **fluid, dual-speed operating system**:

| Capability | Legacy Inventory Tools | The Restock OS |
| :--- | :--- | :--- |
| **Demand Forecasting** | Static moving averages or arbitrary reorder formulas | **3 Production ML Models** (Random Forest with recursive lags, Holt-Winters ETS, and moving average baseline) with multi-horizon evaluation |
| **Workflow Velocity** | 10+ clicks across 4 disconnected screens to issue a PO | **Conversational Copilot** with 1-Click Generative UI action cards and inline PO creation |
| **Stockout Visibility** | Discovered only after backorders and fulfillment delays | **Proactive Alerts Radar** & automated reorder shortfall suggestions computed against future demand |
| **Workspace Ergonomics** | Clunky, dated enterprise forms | **Ultra-Clean Minimalist UI** (Linear/Vercel-inspired Obsidian/Zinc design tokens, 1px micro-borders, Framer Motion springs) |
| **Data Integrity** | Prone to lost updates during simultaneous stock writes | **Deterministic In-Process Locks (`stock_level_lock`)**, DB pessimistic locks, deadlock prevention, and immutable movement logs |
| **Audit & Governance** | Opaque database mutations | **Full Historical Audit Trail**, batched CSV validation summaries, and two-tier RBAC authorization |

---

## 🖥️ The Progressive-Canvas Interface

The frontend is **one shell with six screen-states, not a set of routed pages** — there is no `react-router`.
Chat is the full-width home surface; a canvas panel opens on demand beside it and can escalate to a
full-bleed board. What's on screen is a function of shell state (`isAuthenticated`, the message log, which
canvas view is open, whether the palette or mobile sheet is up), which is why "Purchase orders" is a canvas
mode rather than a URL.

```
+-------------------------------------------------------------------------------------------------------------+
| [R]  ACME WAREHOUSING                                     |  ALERTS   REORDER   FORECAST            ⛶   ✕   |
|      ------------------------------------------------------------------------------------------------------ |
| [+]  ▪ RESTOCK  02:04                                     |  OPEN ALERTS (1)                                 |
| [⏱]  Morning — here's where things stand.                 |  ▲ Widget A — SKU-1042                           |
| [🔍] +------------+ +---------------+ +--------------+    |    12 units left · reorder pt 50 · Main Warehouse |
|      | TURNOVER   | | STOCKOUT RATE | | ▪ OPEN ALERTS|    |                                                  |
|      |   0.0×     | |     0.0%      | |      1       |    |  REORDER SUGGESTION                              |
|      +------------+ +---------------+ +--------------+    |  Widget A → Acme Corp        [ Create PO ]       |
|                                                           |  Suggested qty: 120 units · lead time 14 days    |
|                            ( What needs reordering? )     |                                                  |
|      ▪ RESTOCK  02:04                                     |  FORECAST — SKU-1042, NEXT 14 DAYS               |
|      Three products are below their reorder point —       |   ╭╌╌╮       ╭╌╌╮                                |
|      I've opened them in the canvas.                      |  ─┴──┴───────┴──┴──── Exp. smoothing             |
|                                                           |                       Random forest              |
| [VT] [ Ask a follow-up...                            ↑ ]  |                                                  |
+-------------------------------------------------------------------------------------------------------------+
```

The six states: **Login** · **empty-chat home** · **chat with canvas open** · **PO Kanban expanded** ·
**⌘K command palette** (an overlay dimming the live app root) · **mobile** (its own composed screen below
~768px, not a responsive resize of the desktop layout).

---

## 🤖 Chat, Canvas & What's Actually Wired

**Important, stated plainly: chat replies are scripted, the data is real.** There is no LLM or RAG backend
yet. Quick-prompt chips and free text map through a deterministic response table
(`src/lib/scriptedResponses.tsx`) to a canned reply plus a canvas action; anything not in that table gets an
honest "this is a scripted preview" message rather than a fabricated answer. Everything the canvas *renders*
is fetched live from the FastAPI backend.

```mermaid
flowchart LR
    Prompt["Quick-prompt chip / free text"] --> Script["scriptedResponses.tsx\n(deterministic reply + canvas action)"]
    Script --> Shell["ShellContext (useReducer)\ncanvas: null | widgets | kanban"]
    Shell --> Hooks["Data hooks\n(useCanvasWidgetsData, usePOKanbanData,\nuseDashboardKpiStats, useMobileAlertsData)"]
    Hooks --> API["FastAPI\n/alerts · /reorder/suggestions · /forecast/compare\n/purchase-orders · /dashboard/kpis"]
    API --> Canvas["Rendered canvas surfaces"]
```

| Surface | Backend source | Notes |
| :--- | :--- | :--- |
| KPI stat grid (first message) | `GET /dashboard/kpis?days=30` | Turnover, stockout rate, open-alert count |
| Alerts list | `GET /alerts` | Product/warehouse names resolved via cached lookups |
| Reorder recommendation | `GET /reorder/suggestions` | Real shortfall qty and supplier lead time |
| Forecast chart | `GET /forecast/compare` | Hand-drawn SVG; second series only if a second model was trained |
| PO Kanban board | `GET /purchase-orders?limit=200` | Real PO numbers, statuses, partial-receipt progress |
| Login / session | `POST /auth/login`, `GET /auth/me` | Real JWT + silent refresh-and-retry on 401 |

Empty states are honest: no trained forecast runs, or nothing currently at risk, renders an explicit
"nothing here" message rather than a placeholder chart or invented card.

---

## ⌨️ Command Palette

Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd>) anywhere to open the palette;
<kbd>Esc</kbd> closes whichever overlay is open. The global listener lives in `ShellContext`.

```
┌────────────────────────────────────────────────────────┐
│  🔍  Search or jump to...▌                     [ESC]   │
├────────────────────────────────────────────────────────┤
│  GO TO                                                 │
│  📈  Demand forecast             Planning         ↵    │
│  📦  Inventory and stock levels  Operations            │
│  🛒  Purchase orders             Procurement           │
│  🛡️  Low-stock alerts            Monitoring            │
└────────────────────────────────────────────────────────┘
```

> The palette's query text and result rows are **display-only** by design — it is not wired to real search.
> Only the chat-opened canvas surfaces and the Kanban board consume live data.

---

## 📊 Backend Capabilities Behind the Canvas

The operational logic below lives in the backend and is reachable over the API, whether or not a given
frontend surface exposes it yet:

### Executive KPIs (`GET /dashboard/kpis`)
- **Inventory Turnover Ratio**: Sales velocity over current on-hand inventory ($\frac{\sum \text{Sales}_{30\text{d}}}{\text{Total On-Hand}}$) — a simplified proxy, since there is no COGS tracking or historical inventory snapshot.
- **Stockout Rate**: Percentage of tracked product-warehouse pairs currently at zero stock ($\frac{N_{\text{zero}}}{N_{\text{total}}} \times 100$).
- **Forecast Accuracy**: MAE and MAPE evaluated against real ground-truth sales records (MAPE excludes zero-actual days).

### Stock Levels & Audit Trail (`/stock`, `GET /stock/movements`)
- Atomic, race-safe stock adjustments with structured movement reasons (`cycle_count`, `damage_writeoff`, `inbound_discrepancy`, `internal_transfer`).
- Full filterable movement ledger by product, warehouse, and date range.

### Demand Forecasting (`/forecast`, `GET /forecast/compare`)
- **3 Production Algorithms**:
  - **Random Forest Regressor**: Feature-engineered with `lag_1`, `lag_7`, `rolling_mean_7`, `rolling_mean_28`, day-of-week, month cyclical encoding, and calendar holiday flags. Recursive multi-step future forecasting.
  - **Exponential Smoothing (ETS / Holt-Winters)**: Daily resampled time series with configurable gap-fill strategies (`zero` vs. `interpolate`).
  - **Moving Average Baseline**: Rolling window benchmark for baseline comparison.
- Genuine future-dated forecasts (not a historical backtest), trained in a background task, with persisted models.
- `/forecast/compare` returns each model type's most recent completed run for a product-warehouse pair.

### Purchase Order Workflow (`/purchase-orders`)
- Full procurement lifecycle: `Draft` &rarr; `Submitted` &rarr; `Approved` &rarr; `Partially received` &rarr; `Received` (or `Cancelled`).
- **Partial Receiving**: Receive outstanding line items incrementally with atomic inventory updates and stock movement logging.

### Low-Stock Alerts (`/alerts`)
- Monitoring of available quantities against product-specific reorder points.
- **Recompute**: Recalculates thresholds across all SKUs, auto-resolves recovered inventory, and triggers background email notifications via SMTP — but only when a recompute genuinely opens a new alert.

### Sales EDA & Data Ingestion (`/upload`, `/eda`)
- Ingestion of legacy sales CSV files (`date, store, item, sales`), validated then persisted in a background task.
- Automatic entity bridging (creates legacy warehouses & products on the fly), idempotent by `(date, product, warehouse)`.
- Server-side Matplotlib/Seaborn profiling: sales trend line, correlation matrix heatmap, distribution histogram, and boxplot outliers.

---

## 🔄 End-to-End Operational Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Ops as Operations Lead
    participant Copilot as Restock Copilot
    participant Engine as Agent & Tool Registry
    participant Backend as FastAPI Backend
    participant DB as SQLite / PostgreSQL

    Ops->>Copilot: Type "/reorder" or "What items need restocking?"
    Copilot->>Engine: Resolve intent `get_reorder_suggestions`
    Engine->>Backend: GET /reorder/suggestions
    Backend->>DB: Query (stock_levels, forecasts, reorder_points)
    DB-->>Backend: Return shortfall records
    Backend-->>Engine: 200 OK (Product #101 shortfall +68 units)
    Engine-->>Copilot: Render ReorderActionWidget
    Ops->>Copilot: Click [ Create PO ]
    Copilot->>Engine: Dispatch `create_purchase_order`
    Engine->>Backend: POST /purchase-orders (Supplier #1, WH #1, Qty 68)
    Backend->>DB: INSERT purchase_orders + items
    Backend-->>Engine: 201 Created (PO-2026-089)
    Engine-->>Copilot: Render POStepperWidget (Status: Draft)
    Ops->>Copilot: Switch to PO Kanban to Approve & Receive
```

---

## 📈 Multi-Model Demand Forecasting Engine

Restock provides a modular demand forecasting subsystem operating directly over the normalized `sales_records` table, scoped to distinct `(product_id, warehouse_id)` tuples.

```mermaid
graph TD
    A[Sales Records in DB] --> B{Sufficient History? Count >= 10}
    B -- No --> C[Raise InsufficientHistoryError / HTTP 400]
    B -- Yes --> D[Load & Sort Historical DataFrame]
    
    D --> E{Selected Model Type}
    
    subgraph RF ["Random Forest Pipeline"]
        E -- "random_forest" --> RF1[Reindex to Continuous Daily Index asfreq('D')]
        RF1 --> RF2[Generate Lag Features: lag_1, lag_7]
        RF2 --> RF3[Generate Rolling Means: 7d, 28d min_periods=1]
        RF3 --> RF4[Engineer Date Features: Sin/Cos Month, Holidays, Weekend]
        RF4 --> RF5[Drop Initial 7 Cold-Start NaN Rows]
        RF5 --> RF6[Split 80/20 Holdout -> Fit Eval RF -> Compute RMSE/MAE]
        RF6 --> RF7[Refit Final RF on 100% History]
        RF7 --> RF8[Recursive Multi-Step Prediction Loop for Horizon Days]
    end
    
    subgraph ES ["Exponential Smoothing Pipeline"]
        E -- "exponential_smoothing" --> ES1[Reindex to Daily Series asfreq('D')]
        ES1 --> ES2{Gap Fill Strategy}
        ES2 -- "zero" --> ES3[Fill NaN gaps with 0.0]
        ES2 -- "interpolate" --> ES4[Interpolate linear sales across gaps]
        ES3 --> ES5[Fit ExponentialSmoothing Statsmodels additive trend]
        ES4 --> ES5
        ES5 --> ES6[Forecast Horizon Steps Forward]
    end
    
    subgraph MA ["Moving Average Pipeline"]
        E -- "moving_average" --> MA1[Reindex to Daily Series asfreq('D')]
        MA1 --> MA2[Compute Trailing 7-Day Rolling Mean]
        MA2 --> MA3[Project Final Rolling Mean Constant Across Horizon]
    end

    RF8 --> CLIP[Universal Non-Negative Floor: max 0.0, y]
    ES6 --> CLIP
    MA3 --> CLIP
    CLIP --> PERSIST[Persist Model to Disk / Save Predictions to DB]
```

### 1. Mathematical Feature Engineering

The temporal feature pipeline transforms raw timestamp data into structured feature vectors:

$$\text{month\_sin} = \sin\left(\frac{2\pi \cdot \text{month}}{12}\right), \quad \text{month\_cos} = \cos\left(\frac{2\pi \cdot \text{month}}{12}\right)$$

$$\text{is\_weekend} = \mathbb{I}(\text{day\_of\_week} \in \{5, 6\})$$

$$\text{is\_holiday} = \mathbb{I}(\text{date} \in \text{Holidays}_{\text{country}}(\text{years}))$$

> [!NOTE]
> **Holiday Calendar Evaluation**:
> Eager holiday calendar expansion (`years=list(range(min_year, max_year + 1))`) resolves lazy-loading issues, and strict date typing (`dates.dt.date`) ensures robust holiday flag identification.

### 2. Model Archetypes & Algorithms

1. **Random Forest Regressor (`random_forest`)**:
   - `RandomForestRegressor(n_estimators=200, random_state=42)` trained on lag terms ($\text{lag}_1, \text{lag}_7$) and rolling averages ($\text{roll}_7, \text{roll}_{28}$).
   - **Cold-Start Handling**: Rolling means use `min_periods=1` to allow model training with history lengths down to `MIN_HISTORY_ROWS=10`.
   - **Recursive Multi-Step Forecasting**: Future projections use iterative walk-forward prediction where day $t$'s prediction updates the lag and rolling window for day $t+1$.
2. **Holt-Winters Exponential Smoothing (`exponential_smoothing`)**:
   - Additive trend modeling from `statsmodels.tsa.holtwinters`.
   - Configurable gap-fill strategies: `"zero"` (default retail assumption) vs `"interpolate"`.
3. **Moving Average Baseline (`moving_average`)**:
   - Trailing 7-day walk-forward window benchmark.

### 3. Model Persistence & Evaluation

- **Zero-Retrain Retrieval**: Fitted models serialize to disk (`backend/data/models/{run_id}.joblib`), while predictions persist in `forecast_predictions`. Subsequent reads via `GET /forecast/{id}` return cached predictions instantly.
- **Universal Non-Negative Floor**: All raw model outputs are clipped to $\max(0.0, \hat{y})$.
- **Holdout Validation**: 80/20 train/test split computes out-of-sample RMSE and MAE:

$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2}, \quad \text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$

---

## 🛡️ Concurrency, Reliability & Data Integrity

Restock is engineered with defensive concurrency controls to ensure data integrity during simultaneous stock writes:

```
+-------------------------------------------------------------------------------------------------------------+
|                                    CONCURRENCY THREAT MITIGATION MATRIX                                     |
+---------------------------+-----------------------------------+---------------------------------------------+
| Concurrency Threat        | Vulnerability Window              | Restock Defensive Implementation            |
+---------------------------+-----------------------------------+---------------------------------------------+
| Lost Updates on Stock     | Concurrent stock adjustments or   | In-process threading lock (stock_level_lock)|
| Increment / Decrement     | receipts reading stale quantities | held from read through commit + FOR UPDATE  |
+---------------------------+-----------------------------------+---------------------------------------------+
| Insert Collision Race     | Two threads concurrently creating | Handled via IntegrityError catch and        |
| on New StockLevel Row     | first StockLevel for a product/WH | automatic retry in get_or_create_stock_level|
+---------------------------+-----------------------------------+---------------------------------------------+
| Deadlocks during          | Multiple threads receiving POs    | Product IDs sorted before acquisition       |
| Multi-SKU PO Receipts     | with overlapping SKUs in reverse  | using ExitStack lock sequencing             |
+---------------------------+-----------------------------------+---------------------------------------------+
| Stale Identity Map Caches | Re-reading items already loaded   | Mandatory .populate_existing() call on      |
| in SQLAlchemy Session     | in the same database session      | all re-queried concurrent records           |
+---------------------------+-----------------------------------+---------------------------------------------+
| SQLite ALTER TABLE Limits | Schema migrations attempting to   | Alembic configured with                     |
| during DB Upgrades        | drop/modify columns in SQLite     | render_as_batch=True                        |
+---------------------------+-----------------------------------+---------------------------------------------+
| DB Session Leaks in       | Background tasks inheriting       | Explicit import database; SessionLocal()    |
| Async Background Tasks    | closed HTTP request session       | pattern with try...finally session closing  |
+---------------------------+-----------------------------------+---------------------------------------------+
```

### Deadlock Prevention via Sorted Lock Acquisition

When receiving purchase orders containing multiple line items, locks are acquired in sorted product ID order using `contextlib.ExitStack`:

```python
# Prevent deadlocks by sorting product IDs before acquiring locks
sorted_product_ids = sorted(list(product_ids))
with ExitStack() as stack:
    for pid in sorted_product_ids:
        stack.enter_context(stock_level_lock(pid, warehouse_id))
    # Execute atomic receiving and commit
    db.commit()
```

---

## 🔐 Security, Auth & RBAC Architecture

Restock implements an enterprise-grade security model:

```mermaid
flowchart LR
    ClientAuth["Client Request"] --> RateLimit["SlowAPI Rate Limiter\n(5 requests/min on /auth)"]
    RateLimit --> AuthRouter["FastAPI Auth Router"]
    AuthRouter --> Bcrypt["Direct Bcrypt Hashing\n(72-byte safe, no passlib)"]
    AuthRouter --> Tokens["Token Issuance\n(15m JWT + 30d SHA-256 Refresh Token)"]
    
    subgraph RBAC ["Two-Tier RBAC Strategy"]
        AdminRole["require_admin\n(Master Data CRUD, PO Cancel, Users)"]
        StaffRole["get_current_user\n(Stock Adjust, PO Create/Receive, Forecast)"]
        PublicRole["get_current_user_optional\n(Read-only queries, Open Ingest)"]
    end
```

- **JWT Access & Refresh Token Rotation**: 15-minute access tokens paired with 30-day high-entropy opaque refresh tokens (SHA-256 hashed at rest).
- **Direct Bcrypt Password Hashing**: Hashing uses `bcrypt` directly with a strict 72-byte Pydantic boundary, avoiding `passlib` truncation bugs.
- **Fail-Safe Startup Verification**: If `ENVIRONMENT=production` and `JWT_SECRET_KEY` remains on the default secret, the server refuses to boot.
- **Transparent 401 Auto-Refresh**: Axios interceptor silently exchanges expired tokens via `/auth/refresh` and replays pending requests without UI interruption.

---

## 🗄️ Database Schema

The database model is managed via version-controlled **Alembic** migrations:

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : owns
    WAREHOUSES ||--o{ STOCK_LEVELS : stores
    PRODUCTS ||--o{ STOCK_LEVELS : tracked_in
    PRODUCTS ||--o{ STOCK_MOVEMENTS : logs
    WAREHOUSES ||--o{ STOCK_MOVEMENTS : originates
    SUPPLIERS ||--o{ PURCHASE_ORDERS : fulfills
    WAREHOUSES ||--o{ PURCHASE_ORDERS : delivers_to
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : contains
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : ordered
    PRODUCTS ||--o{ SALES_RECORDS : recorded_for
    WAREHOUSES ||--o{ SALES_RECORDS : sold_at
    PRODUCTS ||--o{ FORECAST_RUNS : forecasts
    WAREHOUSES ||--o{ FORECAST_RUNS : forecasts_at
    FORECAST_RUNS ||--|{ FORECAST_PREDICTIONS : generates
    PRODUCTS ||--o{ ALERTS : triggers
    WAREHOUSES ||--o{ ALERTS : located_in

    USERS {
        int id PK
        string email UK
        string hashed_password
        string role "admin | staff"
        boolean is_active
        datetime created_at
    }

    PRODUCTS {
        int id PK
        string sku UK
        string name
        string category
        float price
        int reorder_point
        int safety_stock
        int reorder_quantity
        boolean is_active
    }

    STOCK_LEVELS {
        int id PK
        int product_id FK
        int warehouse_id FK
        int quantity_on_hand
        int quantity_reserved
    }

    PURCHASE_ORDERS {
        int id PK
        string po_number UK
        int supplier_id FK
        int warehouse_id FK
        string status "draft|submitted|approved|partially_received|received|cancelled"
        datetime order_date
    }
```

---

## 🔌 API Reference

Restock exposes a fully documented, type-safe REST API at `/docs`. Below is a comprehensive reference of all endpoints:

### Authentication & Users
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Open (Rate-limited) | Register new user account (defaults to `staff` role) |
| `POST` | `/auth/login` | Open (Rate-limited) | Authenticate user; returns JWT access + refresh tokens |
| `POST` | `/auth/refresh` | Open | Exchange valid refresh token for a new access token |
| `POST` | `/auth/logout` | Open | Revoke active refresh token |
| `GET` | `/auth/me` | Authenticated | Return identity and role of currently authenticated user |
| `GET` | `/users` | `require_admin` | List all users (`skip`, `limit` pagination) |
| `PATCH` | `/users/{id}/role` | `require_admin` | Update user role (`admin` or `staff`) |
| `PATCH` | `/users/{id}/deactivate` | `require_admin` | Soft-deactivate a user account |

### Master Data (Products, Warehouses, Suppliers)
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Open | Paginated product list (`?search=`, `skip`, `limit`) |
| `POST` | `/products` | `require_admin` | Create new SKU product catalog entry |
| `GET` | `/products/export` | Open | Stream product catalog as CSV |
| `GET` | `/products/{id}` | Open | Retrieve product by ID |
| `PUT` | `/products/{id}` | `require_admin` | Update product details and reorder thresholds |
| `DELETE`| `/products/{id}` | `require_admin` | Soft-deactivate product |
| `GET` | `/warehouses` | Open | List warehouses (`?search=`, `skip`, `limit`) |
| `POST` | `/warehouses` | `require_admin` | Create new warehouse facility |
| `PUT` | `/warehouses/{id}` | `require_admin` | Update warehouse details |
| `DELETE`| `/warehouses/{id}` | `require_admin` | Soft-deactivate warehouse |
| `GET` | `/suppliers` | Open | List suppliers (`?search=`, `skip`, `limit`) |
| `POST` | `/suppliers` | `require_admin` | Create new supplier record |
| `PUT` | `/suppliers/{id}` | `require_admin` | Update supplier details |
| `DELETE`| `/suppliers/{id}` | `require_admin` | Soft-deactivate supplier |

### Stock Levels & Audit Movements
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/stock` | Open | List paginated stock levels across warehouses |
| `POST` | `/stock/adjust` | Authenticated | Atomically adjust inventory with audit movement tagging |
| `GET` | `/stock/movements` | Open | Query immutable audit log of inventory movements |

### Purchase Orders & Procurement
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/purchase-orders` | Open | Paginated list of purchase orders with line items |
| `POST` | `/purchase-orders` | Authenticated | Create new draft purchase order |
| `GET` | `/purchase-orders/export` | Open | Stream purchase orders as CSV |
| `GET` | `/purchase-orders/{id}` | Open | Retrieve single purchase order with line items |
| `PUT` | `/purchase-orders/{id}/status` | Authenticated* | Transition PO state (`submitted`, `approved`, `cancelled`*) |
| `POST` | `/purchase-orders/{id}/receive`| Authenticated | Receive partial or full quantities; atomically increments stock |

*\*Note: Cancelling a purchase order requires `admin` role.*

### Demand Forecasting & Replenishment
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/forecast` | Open | Schedule background ML training run for (Product, Warehouse) |
| `GET` | `/forecast` | Open | List past forecast runs (`product_id`, `warehouse_id`) |
| `GET` | `/forecast/compare` | Open | Compare most recent run across all 3 model types |
| `GET` | `/forecast/{id}` | Open | Retrieve cached predictions and evaluation metrics |
| `GET` | `/reorder/suggestions` | Open | Compute replenishment shortfalls against predicted demand |

### Ingestion, EDA & Telemetry
| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload` | Open | Upload historical sales CSV (`date, store, item, sales`) |
| `GET` | `/upload/history` | Open | Paginated list of historical dataset uploads |
| `GET` | `/eda` | Open | Retrieve Matplotlib/Seaborn statistical charts and summaries |
| `GET` | `/alerts` | Open | List open low-stock alerts |
| `POST` | `/alerts/recompute` | Open | Recompute inventory threshold breaches & trigger alerts |
| `GET` | `/dashboard/kpis` | Open | Compute turnover ratio, stockout rate, and forecast accuracy |
| `GET` | `/health` | Open | Active database connectivity health check (`SELECT 1`) |
| `GET` | `/metrics` | Open | Prometheus exposition format telemetry metrics |

---

## 🧪 Testing & Quality Assurance

Restock maintains strict test coverage across backend services and frontend components:

```bash
# Run Backend Pytest Suite (99 Tests Passing)
cd backend
pytest

# Verify Alembic Migration Schema Consistency
alembic check

# Lint the frontend (oxlint)
cd ../frontend
npm run lint

# Type-check and compile the production bundle (runs `tsc -b`, then Vite -> dist/)
npm run build
```

> The frontend has no unit-test suite yet — `npm run lint` and `npm run build` are its automated checks.

---

## ⚙️ Configuration Matrix

### Backend Configuration (`backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///data/inventory.db` | SQLAlchemy connection string (SQLite or PostgreSQL) |
| `JWT_SECRET_KEY` | `dev-insecure-secret-key...` | Cryptographic secret for JWT signing (**override in production**) |
| `ENVIRONMENT` | `development` | Deployment environment (`development` or `production`) |
| `HOLIDAY_COUNTRY` | `IN` | Country code for calendar feature engineering (`US`, `IN`, `GB`) |
| `ALERT_NOTIFICATION_EMAILS` | `""` | Comma-separated email addresses for low-stock alerts |
| `SMTP_HOST` | `""` | Outbound SMTP server hostname |
| `SMTP_PORT` | `587` | Outbound SMTP server port |
| `SMTP_USERNAME` | `""` | SMTP authentication username |
| `SMTP_PASSWORD` | `""` | SMTP authentication password |
| `DB_POOL_SIZE` | `5` | Connection pool size for non-SQLite database drivers |
| `DB_MAX_OVERFLOW` | `10` | Max overflow connections for non-SQLite database drivers |

### Frontend Configuration (`frontend/.env.local`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Backend API base URL for Axios client requests. Vite only reads `VITE_`-prefixed vars, and bakes them in at build/start time — changing it needs a restart (or an image rebuild under Docker), not just a reload. |

---

## 📁 Repository Structure

```
restock/
├── backend/
│   ├── alembic/                # Version-controlled database migrations
│   ├── routers/                # 14 Modular FastAPI resource routers
│   ├── auth.py                 # Direct bcrypt hashing & JWT token handling
│   ├── config.py               # Pydantic BaseSettings configuration
│   ├── database.py             # SQLAlchemy session factory & connection pooling
│   ├── forecasting.py          # Machine learning multi-model training & inference
│   ├── ingest.py               # CSV sales ingestion & batched normalization
│   ├── logging_config.py       # JSON structured logging formatter
│   ├── models.py               # SQLAlchemy ORM declarative models
│   ├── schemas.py              # Pydantic request/response validation schemas
│   ├── stock_ops.py            # Thread-safe atomic stock adjustment operations
│   └── tests/                  # Pytest test suite (99 passing tests)
│
├── frontend/                   # Vite + React 19 + TypeScript + Tailwind CSS v3
│   ├── src/
│   │   ├── api/                # Axios resource clients & the 401 refresh-and-retry interceptor
│   │   ├── components/
│   │   │   ├── ui/             # Layer 0 primitives (Button, Card, SeverityIcon, brackets, badges)
│   │   │   ├── shell/          # Layer 1: IconRail, TopHeader, MobileTopBar, ShellContext
│   │   │   ├── chat/           # Layer 2: the chat surface
│   │   │   ├── canvas/         # Layer 3: docked alerts/reorder/forecast widgets + PO Kanban
│   │   │   └── palette/        # Layer 3: the ⌘K command palette
│   │   ├── hooks/              # Data hooks feeding each canvas surface from the real backend
│   │   ├── lib/                # Scripted chat-response table & small display helpers
│   │   ├── screens/            # Layer 4: Login, DesktopShell, MobileShell, CommandPaletteRoot
│   │   └── styles/             # Design tokens (tokens.css)
│   ├── tailwind.config.js      # Design token system wired to the CSS custom properties
│   └── package.json            # Node.js dependencies & Vite/oxlint scripts
│
├── docs/                       # Architectural documentation & upgrade roadmaps
├── docker-compose.yml          # Multi-container production orchestration
└── requirements.txt            # Python dependencies
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with precision for modern supply chains. Crafted with FastAPI, React, and Machine Learning.</sub>
</div>
