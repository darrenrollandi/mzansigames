"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { todayKey } from "@/lib/storage";
import type { GameStats } from "@/lib/stats";
import type { GameId } from "@/components/HowToPlay";

interface GameCardProps {
  id: GameId;
  name: string;
  description: string;
  href: string;
  icon: string;
}

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

function readStats(id: GameId): GameStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`mzansigames:stats:${id}`);
    return raw ? (JSON.parse(raw) as GameStats) : null;
  } catch {
    return null;
  }
}

function useStats(id: GameId): GameStats | null {
  return useSyncExternalStore(
    subscribe,
    () => readStats(id),
    () => null
  );
}

export default function GameCard({ id, name, description, href, icon }: GameCardProps) {
  const stats = useStats(id);
  const playedToday =
    stats?.lastPlayed === todayKey() ? stats?.lastResult ?? null : null;
  const streak = stats?.currentStreak ?? 0;

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 rounded-xl border border-[var(--tile-border)] bg-[var(--game-grey)] p-6 transition-all hover:border-[var(--game-green)] hover:shadow-lg hover:shadow-[var(--game-green)]/10 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
    >
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <h2 className="text-lg font-semibold group-hover:text-[var(--game-green)] transition-colors">
        {name}
      </h2>
      <p className="text-sm text-[var(--foreground)]/60">{description}</p>

      <div className="flex items-center gap-2 mt-1 text-[11px] uppercase tracking-wider">
        {playedToday ? (
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              playedToday === "won"
                ? "bg-[var(--game-green)]/20 text-[var(--game-green)]"
                : "bg-zinc-500/20 text-[var(--foreground)]/60"
            }`}
          >
            {playedToday === "won" ? "Played today" : "Try again tomorrow"}
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 bg-[var(--foreground)]/10 text-[var(--foreground)]/60">
            New today
          </span>
        )}
        {streak > 1 && (
          <span className="rounded-full px-2 py-0.5 bg-amber-500/20 text-amber-300">
            🔥 {streak}
          </span>
        )}
      </div>
    </Link>
  );
}
