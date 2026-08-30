import { useEffect, useState } from 'react';

/**
 * useIsMobile — the ~768px breakpoint the design brief calls for (Layer 4, "composed screens"):
 * "a real ~768px breakpoint below which the whole shell switches to the hamburger+bottom-sheet layout."
 *
 * This value is an EXTRAPOLATION — there is no tablet mockup to interpolate the exact cutoff from (the
 * brief says as much: "this breakpoint value is an extrapolation ... state that explicitly in your report
 * rather than presenting it as sourced"). 768px is used as a plain round-number stand-in for "narrower
 * than a tablet", not a value pulled from any source file.
 *
 * A `matchMedia` listener (not a `resize` handler) so this only re-renders on an actual breakpoint
 * crossing, not every pixel of a drag-resize.
 */
const MOBILE_BREAKPOINT_QUERY = '(max-width: 768px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = () => setIsMobile(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}
