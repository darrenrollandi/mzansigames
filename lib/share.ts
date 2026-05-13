"use client";

import type { LetterResult } from "@/lib/wordle-logic";

const APP_URL = "Mzansi Games";

export function buildWordleShare(
  puzzleNumber: number,
  guesses: { guess: string; results: LetterResult[] }[],
  won: boolean
): string {
  const max = 6;
  const score = won ? guesses.length.toString() : "X";
  const header = `${APP_URL} · Wordle #${puzzleNumber} ${score}/${max}`;
  const grid = guesses
    .map((g) =>
      g.results
        .map((r) =>
          r.status === "correct" ? "🟩" : r.status === "present" ? "🟨" : "⬛"
        )
        .join("")
    )
    .join("\n");
  return `${header}\n\n${grid}`;
}

export type ConnectionsAttempt = {
  /** difficulty of each of the 4 selected words */
  difficulties: (1 | 2 | 3 | 4)[];
};

const CONNECTION_EMOJI: Record<number, string> = {
  1: "🟨",
  2: "🟩",
  3: "🟦",
  4: "🟪",
};

export function buildConnectionsShare(
  puzzleNumber: number,
  attempts: ConnectionsAttempt[],
  mistakes: number,
  won: boolean
): string {
  const header = `${APP_URL} · Connections #${puzzleNumber}`;
  const result = won
    ? mistakes === 0
      ? "Perfect!"
      : `Solved with ${mistakes} mistake${mistakes === 1 ? "" : "s"}`
    : "Did not finish";
  const rows = attempts
    .map((a) => a.difficulties.map((d) => CONNECTION_EMOJI[d] ?? "⬜").join(""))
    .join("\n");
  return `${header}\n${result}\n\n${rows}`;
}

export function buildMiniShare(puzzleNumber: number, hadHelp: boolean): string {
  return `${APP_URL} · Mini #${puzzleNumber}\nSolved${hadHelp ? " (with reveals)" : ""} ✏️`;
}

export function buildStrandsShare(
  puzzleNumber: number,
  sequence: ("theme" | "spangram" | "other")[]
): string {
  const header = `${APP_URL} · Strands #${puzzleNumber}`;
  const emoji = sequence
    .map((s) => (s === "spangram" ? "🟡" : s === "theme" ? "🔵" : "💡"))
    .join("");
  return `${header}\n${emoji}`;
}

/**
 * Copies text to the clipboard. Falls back to a temporary textarea
 * for environments without the async clipboard API.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
