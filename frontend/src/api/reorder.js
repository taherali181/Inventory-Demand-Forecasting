import client from './client';

// Returns a plain array (not paginated) — the plan is for this to stay
// small at this app's scale (one row per at-risk product/warehouse pair).
export function listReorderSuggestions() {
  return client.get('/reorder/suggestions').then((res) => res.data);
}
