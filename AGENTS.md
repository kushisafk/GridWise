# GridWise

Smart EV charging management system: Python FastAPI backend (`backend/`) + React 18 / Vite / TypeScript dashboard (`frontend/`). They are independent projects — no root-level package manifest.

## Commands

- Backend tests: `cd backend && pytest` (or `pytest backend/tests` from root). `pyproject.toml` sets `pythonpath = ["app", "."]` and `asyncio_mode = "auto"`, so no `PYTHONPATH` is needed. Currently ~198 tests pass; README's "167" is stale.
- Frontend tests: `cd frontend && npm test` (= `vitest run`, one-shot, no watch). Currently 33 tests; README's "23" is stale.
- Frontend typecheck + build: `cd frontend && npm run build` (runs `tsc` then `vite build`). There is **no lint script** in this repo.
- Backend server: `cd backend && python -m uvicorn app.main:app --reload --port 8000`. Swagger at `/docs`. All domain routes are under `/api/v1`.
- Frontend dev: `cd frontend && npm run dev` (port 3000). Vite proxies `/api` → `http://127.0.0.1:8000`, so `VITE_API_BASE_URL=/api/v1` (relative, in `.env.development`) works.
- Headless simulation CLI: `cd backend && python -m app.simulation --scenario HOT_DAY --ticks 10 --optimize`. Scenarios: `NORMAL_DAY`, `HOT_DAY`, `SOLAR_SURPLUS`, `HIGH_EV_DEMAND`, `BESS_STRESS`, `SENSOR_FAILURE`, `OVERNIGHT_CHARGING`, `COMBINED_STRESS`.

## Python environment

- Dependencies come from `backend/requirements.txt`, not the `pyproject.toml` build def. The backend is **not** `pip install -e`d; run `python -m ...`/`pytest` from `backend/` so the top-level `app` package resolves.
- The active `.venv` uses Python 3.10 despite `pyproject.toml` declaring `requires-python = ">=3.11"` (README says 3.10+). Don't "fix" this mismatch.
- `backend/app/config/settings.py` (pydantic-settings) reads `.env` **relative to the process CWD** plus env-var overrides. A backend `.env` does not exist; create one in `backend/` if needed.

## MQTT / hardware

- The FastAPI lifespan starts a background paho MQTT subscriber to a public broker (`broker.hivemq.com:1883`, topic `gridwise/telemetry`) whenever `mqtt_enabled` is true (default). In offline/CI runs set `MQTT_ENABLED=false` (env var or `.env`) to avoid the network thread.

## Parking vision (`backend/app/vision/`, Phase 8)

- Depends on committed CNR-EXT Camera 4 data at repo root `CNR-EXT_FULL_IMAGE_1000x750/` (20 JPEG frames + `camera4.csv` slot boxes). Paths are resolved relative to the repo root from the module's location — don't move or rename that directory.
- Responsibility boundary (see `docs/parking_vision.md`): vision owns physical slot occupancy (`slot_id`, `occupied`, `confidence`); QR/mobile sessions own `ev_id`/`assigned_slot`. They are joined only via `POST /api/v1/parking/combined`. Vision must never do auth, plate recognition, or charging allocation.
- `requirements.txt` pins `opencv-python-headless`. `python -m app.vision.highgui` (desktop demo) needs a full GUI OpenCV; under the headless install it detects the failure, prints an error, and exits — this is intended. Vision tests mock GUI calls.
- `python -m app.vision.validate_camera4` writes an overlay to `outputs/.../camera4_overlay.jpg` (gitignored).

## Frontend

- `src/services/api.ts` is the single API client; it reads `VITE_API_BASE_URL` and appends `/api/v1` when missing. API contract types live in `src/types/api.ts` — keep them in sync with backend `domain/models`.