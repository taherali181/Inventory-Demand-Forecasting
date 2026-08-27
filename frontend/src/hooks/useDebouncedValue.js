import { useEffect, useState } from 'react';

/** Returns `value`, but only updates after `delayMs` of no further changes
 * — used to avoid firing a search request on every keystroke. */
export default function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
