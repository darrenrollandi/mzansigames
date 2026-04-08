import Link from "next/link";

interface GameCardProps {
  name: string;
  description: string;
  href: string;
  icon: string;
}

export default function GameCard({ name, description, href, icon }: GameCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-[var(--tile-border)] bg-[var(--game-grey)] p-6 transition-all hover:border-[var(--game-green)] hover:shadow-lg hover:shadow-[var(--game-green)]/10 hover:-translate-y-0.5"
    >
      <span className="text-3xl">{icon}</span>
      <h2 className="text-lg font-semibold group-hover:text-[var(--game-green)] transition-colors">
        {name}
      </h2>
      <p className="text-sm text-[var(--foreground)]/60">{description}</p>
    </Link>
  );
}
