import GameCard from "@/components/GameCard";

const games = [
  {
    name: "Wordle",
    description: "Guess the 5-letter South African word in 6 tries",
    href: "/wordle",
    icon: "🟩",
  },
  {
    name: "Connections",
    description: "Group 16 words into 4 hidden categories",
    href: "/connections",
    icon: "🔗",
  },
  {
    name: "Mini Crossword",
    description: "Quick 5x5 crossword with an SA twist",
    href: "/mini",
    icon: "✏️",
  },
  {
    name: "Strands",
    description: "Find themed words hidden in a letter grid",
    href: "/strands",
    icon: "🧵",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Welcome to Mzansi Games</h1>
      <p className="text-[var(--foreground)]/60 mb-10 text-center max-w-md">
        South African word games — play a new puzzle every day.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {games.map((game) => (
          <GameCard key={game.href} {...game} />
        ))}
      </div>
    </div>
  );
}
