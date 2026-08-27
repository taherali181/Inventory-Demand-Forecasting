# API versioning policy

This API does not use URL-prefix versioning (`/v1/...`) today, and that's a
deliberate choice, not an oversight — see IMPROVEMENT_PLAN.md Change 11.10.

## Current stance

- There is exactly one consumer of this API: the React frontend in
  `frontend/`, developed and deployed alongside the backend in this same
  repo. A single-frontend-consumer system doesn't yet carry the cost of
  URL-prefix versioning (every client having to track which prefix it's on,
  every route duplicated across prefixes as the API evolves, etc.) for a
  benefit it can't yet realize — there's no second consumer to protect from
  a breaking change.
- The API is implicitly "v1". Every route added so far is additive
  (a new endpoint, a new optional field, a new optional query parameter) or
  changes the *shape* of a response in a way paired with an in-repo
  frontend update in the same change (e.g. Phase 8's pagination rollout,
  which changed every list endpoint's response from a bare array to
  `{items, total}` — a breaking change in isolation, but not one that had
  to coexist with an old client, since the frontend was updated in the same
  commit).
- Breaking changes are avoided where reasonably possible: prefer adding a
  new optional field over repurposing an existing one, prefer a new query
  parameter over changing an existing parameter's meaning, prefer a new
  endpoint over changing an existing endpoint's response shape when the
  old shape still has legitimate callers.

## When to introduce real versioning

Adopt URL-prefix versioning (e.g. `/v2/forecast`) only when a genuine
trigger appears:

- A second, independently-deployed consumer of this API shows up (a mobile
  app, a partner integration, a public API product) that can't be updated
  in lockstep with the backend the way the in-repo frontend can.
- A breaking change becomes unavoidable and there's a real need to serve
  both the old and new shape simultaneously during a migration window.

This is a cheap change to make later: every route in this codebase already
goes through an `APIRouter` (see `backend/routers/`), each mounted with
`app.include_router(...)` in `backend/main.py`. Introducing a `/v1` prefix
at that point is a matter of adding `prefix="/v1"` to each `include_router`
call (or wrapping them under one parent router) — it doesn't require
restructuring how routes are defined.

## What this document is not

This is a policy statement, not an implementation. No code in this repo
currently branches on an API version. If you're looking for the actual
routes, see `README.md`'s endpoint table or `GET /docs` (the live OpenAPI
schema) instead.
