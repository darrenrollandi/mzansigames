"use client";

import { useState, useEffect, useCallback } from "react";
import { getPuzzleIndex } from "@/lib/puzzle-generator";
import {
  evaluateGuess,
  isValidGuess,
  getLetterStates,
  type LetterResult,
} from "@/lib/wordle-logic";
import Keyboard from "@/components/Keyboard";
import Modal from "@/components/Modal";
import answers from "@/data/wordle-answers.json";
import validWords from "@/data/wordle-valid.json";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

type GameStatus = "playing" | "won" | "lost";

interface GuessEntry {
  guess: string;
  results: LetterResult[];
}

// Merge both lists for validation (answers are always valid guesses)
const allValid = Array.from(
  new Set([...validWords.map((w) => w.toLowerCase()), ...answers.map((w) => w.toLowerCase())])
);

// SA-flavoured messages for winning
const WIN_MESSAGES = [
  "Eish, you got it! Lekker!",
  "Yoh, what a legend!",
  "Sharp sharp, you nailed it!",
  "Hayibo! Too clever!",
  "Ja nee, well done boet!",
  "Awe, you cracked it!",
];

export default function WordlePage() {
  const [todayAnswer, setTodayAnswer] = useState("");
  const [previousGuesses, setPreviousGuesses] = useState<GuessEntry[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [shakeRow, setShakeRow] = useState(false);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [toastMessage, setToastMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Pick today's word on mount
  useEffect(() => {
    const idx = getPuzzleIndex(new Date(), answers.length);
    setTodayAnswer(answers[idx].toLowerCase());
  }, []);

  // Show toast briefly
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2000);
  }, []);

  // Show modal after a short delay (let animations finish)
  const showEndModal = useCallback((delay: number) => {
    setTimeout(() => setModalOpen(true), delay);
  }, []);

  // Handle a key press (physical or on-screen)
  const handleKey = useCallback(
    (key: string) => {
      if (gameStatus !== "playing" || !todayAnswer) return;
      // While a row is being revealed, block input
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

        // Start reveal animation
        setRevealingRow(rowIndex);

        // After the flip animation completes for all tiles
        const revealDuration = WORD_LENGTH * 300 + 300;
        setTimeout(() => {
          setPreviousGuesses((prev) => [...prev, newGuess]);
          setCurrentGuess("");
          setRevealingRow(-1);

          const isWin = results.every((r) => r.status === "correct");
          if (isWin) {
            setGameStatus("won");
            setBounceRow(rowIndex);
            setTimeout(() => setBounceRow(-1), 1500);
            showEndModal(1600);
          } else if (rowIndex + 1 >= MAX_GUESSES) {
            setGameStatus("lost");
            showEndModal(800);
          }
        }, revealDuration);

        return;
      }

      // Regular letter
      if (/^[a-zA-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key.toLowerCase());
      }
    },
    [
      gameStatus,
      todayAnswer,
      currentGuess,
      previousGuesses.length,
      revealingRow,
      showToast,
      showEndModal,
    ]
  );

  // Physical keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace" || e.key === "Enter" || /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const letterStates = getLetterStates(previousGuesses);

  // Tile background based on result status
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

  // Build the grid
  function renderGrid() {
    const rows = [];

    for (let r = 0; r < MAX_GUESSES; r++) {
      const isRevealing = revealingRow === r;
      const isBouncing = bounceRow === r;
      const isShaking = shakeRow && r === previousGuesses.length;
      const guessEntry = previousGuesses[r];
      const isCurrentRow = r === previousGuesses.length && !guessEntry;

      const tiles = [];
      for (let c = 0; c < WORD_LENGTH; c++) {
        let letter = "";
        let status: LetterResult["status"] | null = null;
        let flipDelay = 0;
        let shouldFlip = false;
        let shouldBounce = false;

        if (guessEntry) {
          // Completed guess row
          letter = guessEntry.results[c].letter;
          status = guessEntry.results[c].status;
        } else if (isRevealing) {
          // This row is being revealed (we have the guess in currentGuess still)
          const results = evaluateGuess(currentGuess, todayAnswer);
          letter = currentGuess[c] || "";
          status = results[c]?.status || null;
          shouldFlip = true;
          flipDelay = c * 300;
        } else if (isCurrentRow) {
          // Current input row
          letter = currentGuess[c] || "";
        }

        if (isBouncing && guessEntry) {
          shouldBounce = true;
        }

        const hasLetter = letter !== "";
        const borderPop =
          isCurrentRow && hasLetter && !status
            ? "border-zinc-500"
            : "";

        tiles.push(
          <div
            key={c}
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

  const winMessage =
    WIN_MESSAGES[previousGuesses.length % WIN_MESSAGES.length];

  return (
    <div className="flex flex-col items-center min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="w-full border-b border-[var(--tile-border)] py-3">
        <h1 className="text-center text-2xl sm:text-3xl font-bold tracking-wider">
          SA Wordle
        </h1>
      </header>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-white text-black font-bold text-sm px-4 py-2 rounded-md shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Game area */}
      <main className="flex flex-col flex-1 items-center justify-between w-full max-w-lg mx-auto px-4 py-4 gap-4">
        {/* Grid */}
        <div className="flex flex-col gap-1.5 mt-2">{renderGrid()}</div>

        {/* Keyboard */}
        <div className="w-full pb-2">
          <Keyboard onKeyPress={handleKey} letterStates={letterStates} />
        </div>
      </main>

      {/* End-game modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={gameStatus === "won" ? "Winner!" : "Better luck next time"}
      >
        {gameStatus === "won" ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-[var(--foreground)]/80">
              Ag shame, the word was:
            </p>
            <p className="text-2xl font-mono font-bold uppercase tracking-widest text-[var(--game-green)]">
              {todayAnswer}
            </p>
            <p className="text-sm text-[var(--foreground)]/60">
              Come back tomorrow for a new word!
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
