'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPuzzleIndex } from '@/lib/puzzle-generator';
import {
  initializeGame,
  checkGuess,
  shuffleWords,
  type Puzzle,
  type Group,
  type GameState,
} from '@/lib/connections-logic';
import puzzles from '@/data/connections.json';

// ---------------------------------------------------------------------------
// Colour map: difficulty -> colour
// ---------------------------------------------------------------------------
const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#f9df6d', // yellow
  2: '#a0c35a', // green
  3: '#b0c4ef', // blue
  4: '#ba81c5', // purple
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Yellow',
  2: 'Green',
  3: 'Blue',
  4: 'Purple',
};

const MAX_MISTAKES = 4;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ConnectionsPage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shakeWords, setShakeWords] = useState(false);
  const [revealedGroups, setRevealedGroups] = useState<Group[]>([]);

  // Initialize puzzle on mount
  useEffect(() => {
    const idx = getPuzzleIndex(new Date(), puzzles.length);
    const p = puzzles[idx] as Puzzle;
    setPuzzle(p);
    setGame(initializeGame(p));
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const toggleWord = useCallback(
    (word: string) => {
      if (!game || game.gameStatus !== 'playing') return;
      setGame((prev) => {
        if (!prev) return prev;
        const isSelected = prev.selectedWords.includes(word);
        const newSelected = isSelected
          ? prev.selectedWords.filter((w) => w !== word)
          : prev.selectedWords.length < 4
            ? [...prev.selectedWords, word]
            : prev.selectedWords;
        return { ...prev, selectedWords: newSelected };
      });
    },
    [game],
  );

  const handleSubmit = useCallback(() => {
    if (!game || !puzzle || game.selectedWords.length !== 4) return;

    const result = checkGuess(game.selectedWords, puzzle);

    if (result.correct && result.group) {
      const group = result.group;
      setGame((prev) => {
        if (!prev) return prev;
        const newRemaining = prev.remainingWords.filter(
          (w) => !group.words.includes(w),
        );
        const newSolved = [...prev.solvedGroups, group].sort(
          (a, b) => a.difficulty - b.difficulty,
        );
        const newStatus = newSolved.length === 4 ? 'won' : 'playing';
        return {
          ...prev,
          remainingWords: newRemaining,
          solvedGroups: newSolved,
          selectedWords: [],
          gameStatus: newStatus,
        };
      });
    } else {
      // Wrong guess
      if (result.isOneAway) {
        setToast('One away!');
      }
      setShakeWords(true);
      setTimeout(() => setShakeWords(false), 600);

      setGame((prev) => {
        if (!prev) return prev;
        const newMistakes = prev.mistakes + 1;
        const newStatus = newMistakes >= MAX_MISTAKES ? 'lost' : 'playing';
        return {
          ...prev,
          mistakes: newMistakes,
          selectedWords: newStatus === 'lost' ? [] : prev.selectedWords,
          gameStatus: newStatus,
        };
      });
    }
  }, [game, puzzle]);

  const handleDeselectAll = useCallback(() => {
    setGame((prev) => (prev ? { ...prev, selectedWords: [] } : prev));
  }, []);

  const handleShuffle = useCallback(() => {
    setGame((prev) =>
      prev ? { ...prev, remainingWords: shuffleWords(prev.remainingWords) } : prev,
    );
  }, []);

  // On game over (lost), reveal remaining groups
  useEffect(() => {
    if (game?.gameStatus === 'lost' && puzzle) {
      const solvedCategories = new Set(game.solvedGroups.map((g) => g.category));
      const remaining = puzzle.groups
        .filter((g) => !solvedCategories.has(g.category))
        .sort((a, b) => a.difficulty - b.difficulty);

      // Reveal groups one by one with a delay
      remaining.forEach((group, i) => {
        setTimeout(() => {
          setRevealedGroups((prev) => [...prev, group]);
        }, (i + 1) * 600);
      });
    }
  }, [game?.gameStatus, puzzle, game?.solvedGroups]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  if (!game || !puzzle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="animate-pulse text-xl">Loading puzzle...</div>
      </div>
    );
  }

  const mistakeDots = Array.from({ length: MAX_MISTAKES }, (_, i) => (
    <span
      key={i}
      className={`inline-block h-3 w-3 rounded-full mx-0.5 transition-colors duration-300 ${
        i < game.mistakes ? 'bg-zinc-600' : 'bg-amber-500'
      }`}
    />
  ));

  const allSolvedGroups = [
    ...game.solvedGroups,
    ...(game.gameStatus === 'lost' ? revealedGroups : []),
  ].sort((a, b) => a.difficulty - b.difficulty);

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0a0a0a] px-4 py-6 text-white font-sans">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          SA Connections
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Find four groups of four words that share a connection
        </p>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-zinc-700 animate-bounce">
          {toast}
        </div>
      )}

      {/* Solved groups (revealed at top) */}
      <div className="w-full max-w-lg space-y-2 mb-3">
        {allSolvedGroups.map((group) => (
          <div
            key={group.category}
            className="rounded-lg p-3 text-center font-semibold animate-[fadeIn_0.4s_ease-in]"
            style={{
              backgroundColor: DIFFICULTY_COLORS[group.difficulty],
              color: '#1a1a1a',
            }}
          >
            <div className="text-sm font-bold uppercase tracking-wide">
              {group.category}
            </div>
            <div className="text-xs mt-0.5 font-medium">
              {group.words.join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* Word grid */}
      {game.remainingWords.length > 0 && game.gameStatus !== 'lost' && (
        <div className="grid w-full max-w-lg grid-cols-4 gap-2">
          {game.remainingWords.map((word) => {
            const isSelected = game.selectedWords.includes(word);
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                disabled={game.gameStatus !== 'playing'}
                className={`
                  flex items-center justify-center rounded-lg p-2 text-center
                  text-[11px] font-bold uppercase leading-tight tracking-wide
                  min-h-[56px] sm:min-h-[64px] sm:text-xs
                  transition-all duration-150 select-none cursor-pointer
                  ${
                    isSelected
                      ? 'bg-zinc-200 text-zinc-900 ring-2 ring-white scale-[0.97]'
                      : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                  }
                  ${shakeWords && isSelected ? 'animate-[shake_0.5s_ease-in-out]' : ''}
                `}
              >
                {word}
              </button>
            );
          })}
        </div>
      )}

      {/* Mistakes remaining */}
      <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
        <span>Mistakes remaining:</span>
        <span className="flex">{mistakeDots}</span>
      </div>

      {/* Action buttons */}
      {game.gameStatus === 'playing' && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleShuffle}
            className="rounded-full border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 cursor-pointer"
          >
            Shuffle
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={game.selectedWords.length === 0}
            className="rounded-full border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Deselect All
          </button>
          <button
            onClick={handleSubmit}
            disabled={game.selectedWords.length !== 4}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Submit
          </button>
        </div>
      )}

      {/* Win state */}
      {game.gameStatus === 'won' && (
        <div className="mt-8 text-center animate-[fadeIn_0.6s_ease-in]">
          <div className="text-4xl mb-2">Excellent!</div>
          <p className="text-zinc-400 text-sm">
            You solved today&apos;s SA Connections!
            {game.mistakes === 0 && ' Perfect score -- no mistakes!'}
            {game.mistakes === 1 && ' Only 1 mistake. Sharp sharp!'}
            {game.mistakes > 1 && ` ${game.mistakes} mistakes. Not bad, neh?`}
          </p>
        </div>
      )}

      {/* Lose state */}
      {game.gameStatus === 'lost' && (
        <div className="mt-8 text-center animate-[fadeIn_0.6s_ease-in]">
          <div className="text-3xl mb-2">Eish!</div>
          <p className="text-zinc-400 text-sm">
            Better luck tomorrow. Here are the groups you missed:
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-zinc-500">
        {[1, 2, 3, 4].map((d) => (
          <span key={d} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: DIFFICULTY_COLORS[d] }}
            />
            {DIFFICULTY_LABELS[d]}
          </span>
        ))}
      </div>

      {/* Inject keyframe animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
