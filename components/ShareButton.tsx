"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/share";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export default function ShareButton({ text, label = "Share", className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--game-green)] px-5 py-2 text-sm font-semibold text-white shadow transition-transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]/60 cursor-pointer ${className}`}
      aria-live="polite"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 6l-4-4-4 4M12 2v13"
        />
      </svg>
      {copied ? "Copied!" : label}
    </button>
  );
}
