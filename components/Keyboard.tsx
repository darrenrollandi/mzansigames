"use client";

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  letterStates: Record<string, "correct" | "present" | "absent">;
}

const rows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Enter", "Z", "X", "C", "V", "B", "N", "M", "Backspace"],
];

function getKeyColor(
  key: string,
  letterStates: Record<string, "correct" | "present" | "absent">
): string {
  const state = letterStates[key.toLowerCase()];
  switch (state) {
    case "correct":
      return "bg-[var(--game-green)] text-white";
    case "present":
      return "bg-[var(--game-yellow)] text-white";
    case "absent":
      return "bg-[var(--game-grey)] text-white/50";
    default:
      return "bg-[var(--key-bg)] text-white";
  }
}

export default function Keyboard({ onKeyPress, letterStates }: KeyboardProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-lg mx-auto select-none">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5 justify-center w-full">
          {row.map((key) => {
            const isWide = key === "Enter" || key === "Backspace";
            const label = key === "Backspace" ? "Del" : key;

            return (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                className={`
                  ${getKeyColor(key, letterStates)}
                  ${isWide ? "px-3 text-xs" : "px-0"}
                  ${isWide ? "flex-[1.5]" : "flex-1"}
                  h-14 rounded-md font-bold text-sm
                  flex items-center justify-center
                  transition-colors active:scale-95
                  cursor-pointer
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
