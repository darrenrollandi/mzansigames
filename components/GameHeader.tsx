"use client";

import { useState } from "react";
import HowToPlay, { type GameId } from "@/components/HowToPlay";

interface Props {
  game: GameId;
  title: string;
  subtitle?: string;
}

export default function GameHeader({ game, title, subtitle }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="w-full flex items-center justify-center gap-3 mb-2 mt-2">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-xs text-[var(--foreground)]/60 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        aria-label="How to play"
        title="How to play"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--tile-border)] text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:border-[var(--foreground)]/50 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
      >
        <span className="text-sm font-bold leading-none">?</span>
      </button>
      <HowToPlay game={game} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
