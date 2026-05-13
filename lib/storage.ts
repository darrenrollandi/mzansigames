"use client";

import { useCallback, useEffect, useState } from "react";

/** Returns today's YYYY-MM-DD in local time — the puzzle index uses local date too. */
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Persisted state hook. SSR-safe (reads happen after mount).
 * Pass a stable `key` and a default value.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setValue(safeParse(window.localStorage.getItem(key), initial));
    setHydrated(true);
    // we intentionally only hydrate once per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setAndStore = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const computed =
          typeof next === "function"
            ? (next as (p: T) => T)(prev)
            : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(computed));
        } catch {
          // quota / private mode — ignore, in-memory state still works
        }
        return computed;
      });
    },
    [key]
  );

  return [value, setAndStore, hydrated];
}

/**
 * Persisted state scoped to a particular date — clears whenever the
 * date changes. Used so each daily puzzle starts fresh on a new day
 * but resumes if the page is refreshed mid-game.
 */
export function useDailyState<T>(
  game: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const today = todayKey();
  return useLocalStorage<T>(`mzansigames:game:${game}:${today}`, defaultValue);
}
