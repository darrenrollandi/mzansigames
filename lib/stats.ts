"use client";

import { useCallback } from "react";
import { todayKey, useLocalStorage } from "@/lib/storage";

export type GameId = "wordle" | "connections" | "mini" | "strands";

export type GameStats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayed: string | null;
  lastResult: "won" | "lost" | null;
  /** Wordle-only: guess distribution indexed 1..6. */
  guessDistribution?: Record<number, number>;
};

const empty: GameStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayed: null,
  lastResult: null,
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function useGameStats(game: GameId) {
  const [stats, setStats, hydrated] = useLocalStorage<GameStats>(
    `mzansigames:stats:${game}`,
    empty
  );

  const recordResult = useCallback(
    (result: "won" | "lost", extra?: { guesses?: number }) => {
      const today = todayKey();
      setStats((prev) => {
        // Don't double-count the same day.
        if (prev.lastPlayed === today) return prev;
        const won = prev.won + (result === "won" ? 1 : 0);
        const played = prev.played + 1;
        let streak = prev.currentStreak;
        if (result === "won") {
          if (prev.lastPlayed && daysBetween(prev.lastPlayed, today) === 1) {
            streak += 1;
          } else {
            streak = 1;
          }
        } else {
          streak = 0;
        }
        const next: GameStats = {
          played,
          won,
          currentStreak: streak,
          maxStreak: Math.max(prev.maxStreak, streak),
          lastPlayed: today,
          lastResult: result,
        };
        if (extra?.guesses && result === "won") {
          const dist = { ...(prev.guessDistribution ?? {}) };
          dist[extra.guesses] = (dist[extra.guesses] ?? 0) + 1;
          next.guessDistribution = dist;
        } else if (prev.guessDistribution) {
          next.guessDistribution = prev.guessDistribution;
        }
        return next;
      });
    },
    [setStats]
  );

  return { stats, hydrated, recordResult };
}

export function winPercent(stats: GameStats): number {
  if (stats.played === 0) return 0;
  return Math.round((stats.won / stats.played) * 100);
}
