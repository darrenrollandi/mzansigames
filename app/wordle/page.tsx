"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPuzzleIndex } from "@/lib/puzzle-generator";
import {
  evaluateGuess,
  isValidGuess,
  getLetterStates,
  type LetterResult,
} from "@/lib/wordle-logic";
import Keyboard from "@/components/Keyboard";
import Modal from "@/components/Modal";
import GameHeader from "@/components/GameHeader";
import ShareButton from "@/components/ShareButton";
import { useDailyState } from "@/lib/storage";
import { useGameStats, winPercent } from "@/lib/stats";
import { buildWordleShare } from "@/lib/share";
import answers from "@/data/wordle-answers.json";
import validWords from "@/data/wordle-valid.json";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

type GameStatus = "playing" | "won" | "lost";

interface GuessEntry {
  guess: string;
  results: LetterResult[];
}

type PersistedState = {
  guesses: GuessEntry[];
  status: GameStatus;
  reportedResult: boolean;
  hintsUsed: number;
};

const allValid = Array.from(
  new Set([
    ...validWords.map((w) => w.toLowerCase()),
    ...answers.map((w) => w.toLowerCase()),
  ])
);

const WIN_MESSAGES = [
  "Eish, you got it! Lekker!",
  "Yoh, what a legend!",
  "Sharp sharp, you nailed it!",
  "Hayibo! Too clever!",
  "Ja nee, well done boet!",
  "Awe, you cracked it!",
];

export default function WordlePage() {
  const { puzzleIndex, todayAnswer } = useMemo(() => {
    const idx = getPuzzleIndex(new Date(), answers.length);
    return { puzzleIndex: idx, todayAnswer: answers[idx].toLowerCase() };
  }, []);

  const [persisted, setPersisted, hydrated] = useDailyState<PersistedState>(
    "wordle",
    { guesses: [], status: "playing", reportedResult: false, hintsUsed: 0 }
  );

  const [currentGuess, setCurrentGuess] = useState("");
  const [shakeRow, setShakeRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [toastMessage, setToastMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const previousGuesses = persisted.guesses;
  const gameStatus = persisted.status;
  const { stats, recordResult } = useGameStats("wordle");

  // Surface the end-game modal automatically when a finished game is reloaded.
  useEffect(() => {
    if (!hydrated) return;
    if (gameStatus !== "playing") setModalOpen(true);
    // Only run when hydration completes — subsequent transitions handle their own modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2000);
  }, []);

  const showEndModal = useCallback((delay: number) => {
    setTimeout(() => setModalOpen(true), delay);
  }, []);

  const handleHint = useCallback(() => {
    if (!hydrated || gameStatus !== "playing") return;
    if (revealingRow >= 0) return;
    if (previousGuesses.length >= MAX_GUESSES) return;

    // Find positions the player already knows are correct.
    const known = new Set<number>();
    for (const g of previousGuesses) {
      for (let i = 0; i < g.results.length; i++) {
        if (g.results[i].status === "correct") known.add(i);
      }
    }
    let pos = -1;
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (!known.has(i)) { pos = i; break; }
    }
    if (pos < 0) {
      showToast("All letters already known");
      return;
    }

    const results: LetterResult[] = Array.from({ length: WORD_LENGTH }, (_, i) =>
      i === pos
        ? { letter: todayAnswer[i], status: "correct" as const }
        : { letter: "", status: "absent" as const }
    );
    const hintEntry: GuessEntry = {
      guess: results.map((r) => r.letter || " ").join(""),
      results,
    };
    const rowIndex = previousGuesses.length;
    const isLast = rowIndex + 1 >= MAX_GUESSES;

    setRevealingRow(rowIndex);
    const revealDuration = WORD_LENGTH * 200 + 200;
    setTimeout(() => {
      setPersisted((prev) => ({
        ...prev,
        guesses: [...prev.guesses, hintEntry],
        hintsUsed: prev.hintsUsed + 1,
        status: isLast ? "lost" : prev.status,
      }));
      setCurrentGuess("");
      setRevealingRow(-1);
      if (isLast) showEndModal(800);
      else showToast("Letter revealed — one guess used");
    }, revealDuration);
  }, [
    hydrated,
    gameStatus,
    revealingRow,
    previousGuesses,
    todayAnswer,
    setPersisted,
    showEndModal,
    showToast,
  ]);

  const handleKey = useCallback(
    (key: string) => {
      if (!hydrated) return;
      if (gameStatus !== "playing" || !todayAnswer) return;
      if (revealingRow >= 0) return;

      if (key === "Backspace") {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (key === "Enter") {
        if (currentGuess.length !== WORD_LENGTH) {
          setShakeRow(true);
          showToast("Not enough letters");
          setTimeout(() => setShakeRow(false), 500);
          return;
        }

        if (!isValidGuess(currentGuess, allValid)) {
          setShakeRow(true);
          showToast("Not in word list, bru");
          setTimeout(() => setShakeRow(false), 500);
          return;
        }

        const results = evaluateGuess(currentGuess, todayAnswer);
        const newGuess: GuessEntry = { guess: currentGuess, results };
        const rowIndex = previousGuesses.length;

        setRevealingRow(rowIndex);
        const revealDuration = WORD_LENGTH * 300 + 300;
        setTimeout(() => {
          const isWin = results.every((r) => r.status === "correct");
          const isLoss = !isWin && rowIndex + 1 >= MAX_GUESSES;
          const nextStatus: GameStatus = isWin ? "won" : isLoss ? "lost" : "playing";
          setPersisted((prev) => ({
            ...prev,
            guesses: [...prev.guesses, newGuess],
            status: nextStatus,
          }));
          setCurrentGuess("");
          setRevealingRow(-1);

          if (isWin) {
            setBounceRow(rowIndex);
            setTimeout(() => setBounceRow(-1), 1500);
            showEndModal(1600);
          } else if (isLoss) {
            showEndModal(800);
          }
        }, revealDuration);

        return;
      }

      if (/^[a-zA-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key.toLowerCase());
      }
    },
    [
      hydrated,
      gameStatus,
      todayAnswer,
      currentGuess,
      previousGuesses.length,
      revealingRow,
      showToast,
      showEndModal,
      setPersisted,
    ]
  );

  // Record stats once the game ends.
  useEffect(() => {
    if (!hydrated) return;
    if (persisted.reportedResult) return;
    if (gameStatus === "won") {
      recordResult("won", { guesses: previousGuesses.length });
      setPersisted((p) => ({ ...p, reportedResult: true }));
    } else if (gameStatus === "lost") {
      recordResult("lost");
      setPersisted((p) => ({ ...p, reportedResult: true }));
    }
  }, [
    hydrated,
    gameStatus,
    persisted.reportedResult,
    previousGuesses.length,
    recordResult,
    setPersisted,
  ]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (modalOpen) return;
      if (e.key === "Backspace" || e.key === "Enter" || /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey, modalOpen]);

  const letterStates = getLetterStates(previousGuesses);

  function getTileBg(status: LetterResult["status"] | null): string {
    switch (status) {
      case "correct":
        return "bg-[var(--game-green)] border-[var(--game-green)]";
      case "present":
        return "bg-[var(--game-yellow)] border-[var(--game-yellow)]";
      case "absent":
        return "bg-[var(--game-grey)] border-[var(--game-grey)]";
      default:
        return "bg-transparent border-[var(--tile-border)]";
    }
  }

  function renderGrid() {
    const rows = [];
    for (let r = 0; r < MAX_GUESSES; r++) {
      const isRevealing = revealingRow === r;
      const isBouncing = bounceRow === r;
      const isShaking = shakeRow && r === previousGuesses.length;
      const guessEntry = previousGuesses[r];
      const isCurrentRow = r === previousGuesses.length && !guessEntry;

      const revealResults = isRevealing ? evaluateGuess(currentGuess, todayAnswer) : null;
      const tiles = [];
      for (let c = 0; c < WORD_LENGTH; c++) {
        let letter = "";
        let status: LetterResult["status"] | null = null;
        let flipDelay = 0;
        let shouldFlip = false;
        let shouldBounce = false;

        if (guessEntry) {
          letter = guessEntry.results[c].letter;
          status = guessEntry.results[c].status;
        } else if (isRevealing && revealResults) {
          letter = currentGuess[c] || "";
          status = revealResults[c]?.status ?? null;
          shouldFlip = true;
          flipDelay = c * 300;
        } else if (isCurrentRow) {
          letter = currentGuess[c] || "";
        }

        if (isBouncing && guessEntry) {
          shouldBounce = true;
        }

        const hasLetter = letter !== "";
        const borderPop =
          isCurrentRow && hasLetter && !status ? "border-zinc-500" : "";
        const ariaLabel = letter
          ? status
            ? `${letter.toUpperCase()} — ${status}`
            : letter.toUpperCase()
          : "empty";

        tiles.push(
          <div
            key={c}
            role="img"
            aria-label={ariaLabel}
            className={`
              w-14 h-14 sm:w-16 sm:h-16
              flex items-center justify-center
              border-2 rounded
              text-2xl sm:text-3xl font-bold uppercase
              transition-colors
              ${shouldFlip ? "animate-flip" : ""}
              ${shouldBounce ? "animate-bounce-tile" : ""}
              ${status ? getTileBg(status) : `${getTileBg(null)} ${borderPop}`}
              text-white
            `}
            style={{
              animationDelay: shouldFlip
                ? `${flipDelay}ms`
                : shouldBounce
                  ? `${c * 100}ms`
                  : undefined,
              animationFillMode: "both",
            }}
          >
            {letter}
          </div>
        );
      }

      rows.push(
        <div
          key={r}
          className={`flex gap-1.5 justify-center ${isShaking ? "animate-shake" : ""}`}
        >
          {tiles}
        </div>
      );
    }
    return rows;
  }

  const winMessage = WIN_MESSAGES[previousGuesses.length % WIN_MESSAGES.length];
  const shareText = useMemo(
    () =>
      buildWordleShare(
        puzzleIndex + 1,
        previousGuesses,
        gameStatus === "won"
      ),
    [puzzleIndex, previousGuesses, gameStatus]
  );

  return (
    <div className="flex flex-col items-center text-[var(--foreground)] px-4 pb-6">
      <GameHeader
        game="wordle"
        title="SA Wordle"
        subtitle={`Puzzle #${puzzleIndex + 1}`}
      />

      <div
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>

      {toastMessage && (
        <div
          role="alert"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-white text-black font-bold text-sm px-4 py-2 rounded-md shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      <main className="flex flex-col flex-1 items-center justify-between w-full max-w-lg mx-auto gap-4 mt-2">
        <div className="flex flex-col gap-1.5">{renderGrid()}</div>

        <div className="flex items-center justify-center gap-3 -mb-2">
          <button
            type="button"
            onClick={handleHint}
            disabled={
              gameStatus !== "playing" ||
              previousGuesses.length >= MAX_GUESSES ||
              revealingRow >= 0
            }
            title="Reveal a correct letter (uses one of your 6 guesses)"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tile-border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]/80 hover:text-[var(--foreground)] hover:border-[var(--foreground)]/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
          >
            <span aria-hidden="true">💡</span>
            Hint
            <span className="text-[10px] text-[var(--foreground)]/50">(uses a guess)</span>
          </button>
          {persisted.hintsUsed > 0 && (
            <span className="text-[11px] text-[var(--foreground)]/60">
              {persisted.hintsUsed} used
            </span>
          )}
        </div>

        <div className="w-full pb-2">
          <Keyboard onKeyPress={handleKey} letterStates={letterStates} />
        </div>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={gameStatus === "won" ? "Winner!" : gameStatus === "lost" ? "Better luck next time" : "SA Wordle"}
      >
        <div className="space-y-4">
          {gameStatus === "won" ? (
            <>
              <p className="text-xl font-semibold text-[var(--game-green)]">
                {winMessage}
              </p>
              <p className="text-sm text-[var(--foreground)]/70">
                You got it in {previousGuesses.length}{" "}
                {previousGuesses.length === 1 ? "guess" : "guesses"}.
              </p>
              <p className="text-lg font-mono uppercase tracking-widest">
                {todayAnswer}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg text-[var(--foreground)]/80">
                Ag shame, the word was:
              </p>
              <p className="text-2xl font-mono font-bold uppercase tracking-widest text-[var(--game-green)]">
                {todayAnswer}
              </p>
              <p className="text-sm text-[var(--foreground)]/60">
                Come back tomorrow for a new word!
              </p>
            </>
          )}

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--tile-border)]">
            <Stat label="Played" value={stats.played} />
            <Stat label="Win %" value={`${winPercent(stats)}%`} />
            <Stat label="Streak" value={stats.currentStreak} />
          </div>

          <div className="flex justify-center pt-2">
            <ShareButton text={shareText} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--foreground)]/60">
        {label}
      </span>
    </div>
  );
}
