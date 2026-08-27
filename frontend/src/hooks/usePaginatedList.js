import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 50;

/**
 * Shared "Load more" pagination pattern for every backend list endpoint,
 * all of which return { items, total } (see schemas.PaginatedResponse).
 *
 * `fetchPage({ skip, limit })` must return that same { items, total }
 * shape. `deps` re-triggers a full reload from the top (e.g. when a filter
 * changes) — pass the same array you'd give useEffect.
 */
export default function usePaginatedList(fetchPage, deps = []) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (skip, replace) => {
      setIsLoading(true);
      setError(null);
      try {
        const page = await fetchPage({ skip, limit: PAGE_SIZE });
        setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
        setTotal(page.total);
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load data.');
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  const reload = useCallback(() => load(0, true), [load]);
  const loadMore = useCallback(() => load(items.length, false), [load, items.length]);

  useEffect(() => {
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { items, total, isLoading, error, reload, loadMore, hasMore: items.length < total };
}
