import GameCard from "@/components/GameCard";

const games = [
  {
    id: "wordle" as const,
    name: "Wordle",
    description: "Guess the 5-letter South African word in 6 tries",
    href: "/wordle",
    icon: "🟩",
  },
  {
    id: "connections" as const,
    name: "Connections",
    description: "Group 16 words into 4 hidden categories",
    href: "/connections",
    icon: "🔗",
  },
  {
    id: "mini" as const,
    name: "Mini Crossword",
    description: "Quick 5x5 crossword with an SA twist",
    href: "/mini",
    icon: "✏️",
  },
  {
    id: "strands" as const,
    name: "Strands",
    description: "Find themed words hidden in a letter grid",
    href: "/strands",
    icon: "🧵",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
        Mzansi Games
      </h1>
      <p className="text-[var(--foreground)]/60 mb-10 text-center max-w-md">
        Four South African word puzzles. A fresh challenge every day — eish, you in?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {games.map((game) => (
          <GameCard key={game.href} {...game} />
        ))}
      </div>

      <p className="mt-12 text-xs text-[var(--foreground)]/40 max-w-md text-center">
        Daily puzzles roll over at local midnight. Your stats and streaks live
        in this browser — clear your storage and they go with it.
      </p>
    </div>
  );
}
