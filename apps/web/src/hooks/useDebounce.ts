"use client";
import { useEffect, useState } from "react";

/**
 * Debounce a fast-changing value (e.g. a search box). Shared client hook — pure behaviour,
 * no domain logic. Used by the employee typeahead to avoid a request per keystroke.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
