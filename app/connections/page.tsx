'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import GameHeader from '@/components/GameHeader';
import Modal from '@/components/Modal';
import ShareButton from '@/components/ShareButton';
import { useDailyState } from '@/lib/storage';
import { useGameStats, winPercent } from '@/lib/stats';
import { buildConnectionsShare, type ConnectionsAttempt } from '@/lib/share';

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#f9df6d',
  2: '#a0c35a',
  3: '#b0c4ef',
  4: '#ba81c5',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Yellow',
  2: 'Green',
  3: 'Blue',
  4: 'Purple',
};

const MAX_MISTAKES = 4;

type Persisted = {
  game: GameState;
  attempts: ConnectionsAttempt[];
  reportedResult: boolean;
};

export default function ConnectionsPage() {
  const { puzzle, puzzleIndex } = useMemo(() => {
    const idx = getPuzzleIndex(new Date(), puzzles.length);
    return { puzzle: puzzles[idx] as Puzzle, puzzleIndex: idx };
  }, []);

  const [persisted, setPersisted, hydrated] = useDailyState<Persisted>(
    'connections',
    {
      game: initializeGame(puzzle),
      attempts: [],
      reportedResult: false,
    }
  );

  const game = persisted.game;
  const [toast, setToast] = useState<string | null>(null);
  const [shakeWords, setShakeWords] = useState(false);
  const [revealedGroups, setRevealedGroups] = useState<Group[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const { stats, recordResult } = useGameStats('connections');

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!hydrated) return;
    if (game.gameStatus !== 'playing') setModalOpen(true);
    // Only auto-open when hydration first completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const setGame = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setPersisted((prev) => ({ ...prev, game: updater(prev.game) }));
    },
    [setPersisted]
  );

  const toggleWord = useCallback(
    (word: string) => {
      if (game.gameStatus !== 'playing') return;
      setGame((prev) => {
        const isSelected = prev.selectedWords.includes(word);
        const newSelected = isSelected
          ? prev.selectedWords.filter((w) => w !== word)
          : prev.selectedWords.length < 4
            ? [...prev.selectedWords, word]
            : prev.selectedWords;
        return { ...prev, selectedWords: newSelected };
      });
    },
    [game.gameStatus, setGame]
  );

  const handleSubmit = useCallback(() => {
    if (game.selectedWords.length !== 4) return;

    const result = checkGuess(game.selectedWords, puzzle);

    // Capture difficulties of each selected word for share text.
    const wordDifficulty: Record<string, 1 | 2 | 3 | 4> = {};
    for (const g of puzzle.groups) {
      for (const w of g.words) wordDifficulty[w] = g.difficulty as 1 | 2 | 3 | 4;
    }
    const attempt: ConnectionsAttempt = {
      difficulties: game.selectedWords.map(
        (w) => wordDifficulty[w] ?? 1
      ) as (1 | 2 | 3 | 4)[],
    };

    if (result.correct && result.group) {
      const group = result.group;
      setPersisted((prev) => {
        const newRemaining = prev.game.remainingWords.filter(
          (w) => !group.words.includes(w)
        );
        const newSolved = [...prev.game.solvedGroups, group].sort(
          (a, b) => a.difficulty - b.difficulty
        );
        const newStatus = newSolved.length === 4 ? 'won' : 'playing';
        return {
          ...prev,
          attempts: [...prev.attempts, attempt],
          game: {
            ...prev.game,
            remainingWords: newRemaining,
            solvedGroups: newSolved,
            selectedWords: [],
            gameStatus: newStatus,
          },
        };
      });
    } else {
      if (result.isOneAway) setToast('One away!');
      setShakeWords(true);
      setTimeout(() => setShakeWords(false), 600);

      setPersisted((prev) => {
        const newMistakes = prev.game.mistakes + 1;
        const newStatus = newMistakes >= MAX_MISTAKES ? 'lost' : 'playing';
        return {
          ...prev,
          attempts: [...prev.attempts, attempt],
          game: {
            ...prev.game,
            mistakes: newMistakes,
            selectedWords: newStatus === 'lost' ? [] : prev.game.selectedWords,
            gameStatus: newStatus,
          },
        };
      });
    }
  }, [game.selectedWords, puzzle, setPersisted]);

  const handleDeselectAll = useCallback(() => {
    setGame((prev) => ({ ...prev, selectedWords: [] }));
  }, [setGame]);

  const handleShuffle = useCallback(() => {
    setGame((prev) => ({ ...prev, remainingWords: shuffleWords(prev.remainingWords) }));
  }, [setGame]);

  // On loss, reveal remaining groups with a stagger.
  useEffect(() => {
    if (game.gameStatus !== 'lost') return;
    const solvedCategories = new Set(game.solvedGroups.map((g) => g.category));
    const remaining = puzzle.groups
      .filter((g) => !solvedCategories.has(g.category))
      .sort((a, b) => a.difficulty - b.difficulty);

    // Reset reveal list whenever we re-enter this branch
    setRevealedGroups([]);
    const timers: ReturnType<typeof setTimeout>[] = [];
    remaining.forEach((group, i) => {
      timers.push(
        setTimeout(() => {
          setRevealedGroups((prev) => [...prev, group]);
        }, (i + 1) * 600)
      );
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [game.gameStatus, puzzle, game.solvedGroups]);

  // Record stats once.
  useEffect(() => {
    if (!hydrated) return;
    if (persisted.reportedResult) return;
    if (game.gameStatus === 'won') {
      recordResult('won');
      setPersisted((p) => ({ ...p, reportedResult: true }));
    } else if (game.gameStatus === 'lost') {
      recordResult('lost');
      setPersisted((p) => ({ ...p, reportedResult: true }));
    }
  }, [
    hydrated,
    game.gameStatus,
    persisted.reportedResult,
    recordResult,
    setPersisted,
  ]);

  const mistakeDots = Array.from({ length: MAX_MISTAKES }, (_, i) => (
    <span
      key={i}
      className={`inline-block h-3 w-3 rounded-full mx-0.5 transition-colors duration-300 ${
        i < game.mistakes ? 'bg-zinc-600' : 'bg-amber-500'
      }`}
      aria-hidden="true"
    />
  ));

  const allSolvedGroups = [
    ...game.solvedGroups,
    ...(game.gameStatus === 'lost' ? revealedGroups : []),
  ].sort((a, b) => a.difficulty - b.difficulty);

  const shareText = useMemo(
    () =>
      buildConnectionsShare(
        puzzleIndex + 1,
        persisted.attempts,
        game.mistakes,
        game.gameStatus === 'won'
      ),
    [puzzleIndex, persisted.attempts, game.mistakes, game.gameStatus]
  );

  return (
    <div className="flex min-h-[80vh] flex-col items-center bg-[var(--background)] px-4 py-6 text-[var(--foreground)]">
      <GameHeader
        game="connections"
        title="SA Connections"
        subtitle={`Puzzle #${puzzleIndex + 1} — Find four groups of four`}
      />

      <div className="sr-only" role="status" aria-live="polite">
        {toast ?? ''}
      </div>
      {toast && (
        <div
          role="alert"
          className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-zinc-700"
        >
          {toast}
        </div>
      )}

      <div
        className="w-full max-w-lg space-y-2 mb-3 mt-4"
        aria-label="Solved groups"
      >
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

      {game.remainingWords.length > 0 && game.gameStatus !== 'lost' && (
        <div
          className="grid w-full max-w-lg grid-cols-4 gap-2"
          role="group"
          aria-label="Word grid"
        >
          {game.remainingWords.map((word) => {
            const isSelected = game.selectedWords.includes(word);
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                disabled={game.gameStatus !== 'playing'}
                aria-pressed={isSelected}
                className={`
                  flex items-center justify-center rounded-lg p-2 text-center
                  text-[11px] font-bold uppercase leading-tight tracking-wide
                  min-h-[56px] sm:min-h-[64px] sm:text-xs
                  transition-all duration-150 select-none cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]
                  ${
                    isSelected
                      ? 'bg-zinc-200 text-zinc-900 ring-2 ring-white scale-[0.97]'
                      : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                  }
                  ${shakeWords && isSelected ? 'animate-shake' : ''}
                `}
              >
                {word}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
        <span>Mistakes remaining:</span>
        <span className="flex" aria-label={`${MAX_MISTAKES - game.mistakes} mistakes remaining`}>
          {mistakeDots}
        </span>
      </div>

      {game.gameStatus === 'playing' && (
        <div className="mt-4 flex gap-3 flex-wrap justify-center">
          <button
            onClick={handleShuffle}
            className="rounded-full border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
          >
            Shuffle
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={game.selectedWords.length === 0}
            className="rounded-full border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
          >
            Deselect All
          </button>
          <button
            onClick={handleSubmit}
            disabled={game.selectedWords.length !== 4}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
          >
            Submit
          </button>
        </div>
      )}

      {game.gameStatus !== 'playing' && (
        <div className="mt-6">
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-[var(--game-green)] px-5 py-2 text-sm font-semibold text-white shadow hover:scale-[1.02] active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
          >
            View results
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-zinc-500">
        {[1, 2, 3, 4].map((d) => (
          <span key={d} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: DIFFICULTY_COLORS[d] }}
              aria-hidden="true"
            />
            {DIFFICULTY_LABELS[d]}
          </span>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={game.gameStatus === 'won' ? 'Excellent!' : game.gameStatus === 'lost' ? 'Eish!' : 'SA Connections'}
      >
        <div className="space-y-4">
          {game.gameStatus === 'won' ? (
            <p className="text-sm text-[var(--foreground)]/80">
              You solved today&apos;s SA Connections!
              {game.mistakes === 0 && ' Perfect score — no mistakes!'}
              {game.mistakes === 1 && ' Only 1 mistake. Sharp sharp!'}
              {game.mistakes > 1 && ` ${game.mistakes} mistakes. Not bad, neh?`}
            </p>
          ) : (
            <p className="text-sm text-[var(--foreground)]/80">
              Better luck tomorrow. The full reveal is on the board.
            </p>
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
