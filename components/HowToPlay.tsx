"use client";

import Modal from "@/components/Modal";

export type GameId = "wordle" | "connections" | "mini" | "strands";

const COPY: Record<
  GameId,
  { title: string; rules: { heading?: string; body: string }[] }
> = {
  wordle: {
    title: "How to play SA Wordle",
    rules: [
      { body: "Guess the South African word in 6 tries. Each guess must be a real 5-letter word." },
      {
        heading: "After each guess",
        body: "Tiles change colour to give hints:",
      },
      { body: "🟩 Green — right letter, right spot." },
      { body: "🟨 Yellow — right letter, wrong spot." },
      { body: "⬛ Grey — letter is not in the word." },
      { body: "A new puzzle drops every day. Lekker!" },
    ],
  },
  connections: {
    title: "How to play SA Connections",
    rules: [
      { body: "Find the four hidden groups of four. Every word belongs to exactly one group." },
      { heading: "Difficulty", body: "Yellow is easiest, then green, blue, and purple — the trickiest." },
      { body: "Pick four words and tap Submit. Three correct words shows a “One away!” hint." },
      { body: "You have four mistakes before the game ends." },
    ],
  },
  mini: {
    title: "How to play the SA Mini Crossword",
    rules: [
      { body: "Fill the grid using the across and down clues. Click a cell, then type." },
      { body: "Click a cell again to switch between across and down." },
      { body: "Use the Check button to highlight wrong letters and Reveal Word to fill the active clue." },
      { body: "Solve every cell to win — a fresh mini drops daily." },
    ],
  },
  strands: {
    title: "How to play SA Strands",
    rules: [
      { body: "Every letter belongs to one theme word — find them all." },
      { body: "Drag (or tap each cell) along a path. Letters can touch sideways, up & down, or diagonally." },
      { heading: "Spangram", body: "One word is the spangram — it spans the grid and reveals the theme. It glows yellow when found." },
      { heading: "Hints", body: "Find three valid non-theme words to earn a hint that highlights cells from an unfound theme word." },
    ],
  },
};

interface Props {
  game: GameId;
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlay({ game, isOpen, onClose }: Props) {
  const copy = COPY[game];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={copy.title}>
      <div className="space-y-3 text-sm text-[var(--foreground)]/90">
        {copy.rules.map((r, i) => (
          <div key={i}>
            {r.heading ? (
              <p className="font-semibold text-[var(--foreground)]">
                {r.heading}
              </p>
            ) : null}
            <p className="leading-relaxed">{r.body}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
