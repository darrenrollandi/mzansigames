'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPuzzleIndex } from '@/lib/puzzle-generator';
import { isAdjacent, getWordFromCells, checkWord, canEarnHint } from '@/lib/strands-logic';
import type { StrandsPuzzle } from '@/lib/strands-logic';
import puzzles from '@/data/strands-themes.json';
import GameHeader from '@/components/GameHeader';
import Modal from '@/components/Modal';
import ShareButton from '@/components/ShareButton';
import { useDailyState } from '@/lib/storage';
import { useGameStats, winPercent } from '@/lib/stats';
import { buildStrandsShare } from '@/lib/share';

type CellStatus = 'default' | 'selected' | 'theme' | 'spangram';

type Persisted = {
  foundWords: string[];
  foundSpangram: boolean;
  foundCells: { key: string; status: 'theme' | 'spangram' }[];
  hints: number;
  nonThemeCount: number;
  hintedCells: string[];
  shareSequence: ('theme' | 'spangram' | 'other')[];
  reportedResult: boolean;
};

export default function StrandsPage() {
  const { puzzle, puzzleIndex } = useMemo(() => {
    const idx = getPuzzleIndex(new Date(), puzzles.length);
    return { puzzle: puzzles[idx] as unknown as StrandsPuzzle, puzzleIndex: idx };
  }, []);
  const COLS = puzzle.grid[0].length;

  const [persisted, setPersisted, hydrated] = useDailyState<Persisted>(
    `strands-${puzzleIndex}`,
    {
      foundWords: [],
      foundSpangram: false,
      foundCells: [],
      hints: 0,
      nonThemeCount: 0,
      hintedCells: [],
      shareSequence: [],
      reportedResult: false,
    }
  );

  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [message, setMessage] = useState('');
  const [shakeSelection, setShakeSelection] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [popCell, setPopCell] = useState<string | null>(null);
  const [celebrateCells, setCelebrateCells] = useState<Set<string>>(new Set());

  const foundCellsMap = useMemo(() => {
    const m = new Map<string, CellStatus>();
    for (const fc of persisted.foundCells) m.set(fc.key, fc.status);
    return m;
  }, [persisted.foundCells]);

  const hintedSet = useMemo(() => new Set(persisted.hintedCells), [persisted.hintedCells]);
  const totalToFind = puzzle.themeWords.length + 1;
  const totalFound = persisted.foundWords.length;
  const won = totalFound >= totalToFind && persisted.foundSpangram;

  const { stats, recordResult } = useGameStats('strands');

  useEffect(() => {
    if (!hydrated) return;
    if (won) setModalOpen(true);
    // Only auto-open when storage hydrates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (persisted.reportedResult) return;
    if (won) {
      recordResult('won');
      setPersisted((p) => ({ ...p, reportedResult: true }));
    }
  }, [hydrated, won, persisted.reportedResult, recordResult, setPersisted]);

  const cellKey = (r: number, c: number) => `${r},${c}`;
  const isSelected = (r: number, c: number) =>
    selectedCells.some(([sr, sc]) => sr === r && sc === c);

  const flashMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2500);
  }, []);

  const triggerShake = () => {
    setShakeSelection(true);
    setTimeout(() => setShakeSelection(false), 500);
  };

  const submitWord = useCallback(() => {
    if (selectedCells.length < 3) {
      flashMessage('Too short');
      setSelectedCells([]);
      return;
    }

    const word = getWordFromCells(puzzle.grid, selectedCells);
    const result = checkWord(word, selectedCells, puzzle);

    if (result.isSpangram && result.wordPath) {
      const cellKeys = result.wordPath.cells.map(([r, c]) => cellKey(r, c));
      setPersisted((prev) => ({
        ...prev,
        foundCells: [
          ...prev.foundCells,
          ...cellKeys.map((k) => ({ key: k, status: 'spangram' as const })),
        ],
        foundSpangram: true,
        foundWords: [...prev.foundWords, word],
        shareSequence: [...prev.shareSequence, 'spangram'],
      }));
      setCelebrateCells(new Set(cellKeys));
      setTimeout(() => setCelebrateCells(new Set()), 600);
      flashMessage('Spangram found!');
    } else if (result.isTheme && result.wordPath) {
      const cellKeys = result.wordPath.cells.map(([r, c]) => cellKey(r, c));
      setPersisted((prev) => ({
        ...prev,
        foundCells: [
          ...prev.foundCells,
          ...cellKeys.map((k) => ({ key: k, status: 'theme' as const })),
        ],
        foundWords: [...prev.foundWords, word],
        shareSequence: [...prev.shareSequence, 'theme'],
      }));
      setCelebrateCells(new Set(cellKeys));
      setTimeout(() => setCelebrateCells(new Set()), 600);
      flashMessage(`"${word}" found!`);
    } else if (result.isValid) {
      setPersisted((prev) => {
        const newCount = prev.nonThemeCount + 1;
        const earned = canEarnHint(newCount);
        return {
          ...prev,
          nonThemeCount: newCount,
          hints: prev.hints + (earned ? 1 : 0),
          shareSequence: [...prev.shareSequence, 'other'],
        };
      });
      const newCount = persisted.nonThemeCount + 1;
      if (canEarnHint(newCount)) {
        flashMessage('Not a theme word, but you earned a hint!');
      } else {
        const remaining = 3 - (newCount % 3);
        flashMessage(`Not a theme word. ${remaining} more for a hint.`);
      }
      triggerShake();
    } else {
      flashMessage('Not a valid word');
      triggerShake();
    }

    setSelectedCells([]);
  }, [selectedCells, puzzle, persisted.nonThemeCount, setPersisted, flashMessage]);

  const triggerPop = useCallback((r: number, c: number) => {
    const key = cellKey(r, c);
    setPopCell(key);
    setTimeout(() => setPopCell((cur) => (cur === key ? null : cur)), 200);
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (won) return;
      if (foundCellsMap.has(cellKey(row, col))) return;

      if (
        selectedCells.length > 0 &&
        selectedCells[selectedCells.length - 1][0] === row &&
        selectedCells[selectedCells.length - 1][1] === col
      ) {
        submitWord();
        return;
      }

      const existingIdx = selectedCells.findIndex(([r, c]) => r === row && c === col);
      if (existingIdx >= 0) {
        setSelectedCells(selectedCells.slice(0, existingIdx + 1));
        return;
      }

      if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (!isAdjacent(last, [row, col])) {
          setSelectedCells([[row, col]]);
          triggerPop(row, col);
          return;
        }
      }

      setSelectedCells([...selectedCells, [row, col]]);
      triggerPop(row, col);
    },
    [won, foundCellsMap, selectedCells, submitWord, triggerPop]
  );

  const handleHint = useCallback(() => {
    if (persisted.hints <= 0) return;
    const allWords = [...puzzle.themeWords, puzzle.spangram];
    for (const wp of allWords) {
      const upper = wp.word.toUpperCase();
      if (persisted.foundWords.includes(upper)) continue;
      // Highlight ALL cells of the unfound word — clearer than just the start.
      const allCellKeys = wp.cells.map(([r, c]) => cellKey(r, c));
      const alreadyHinted = allCellKeys.every((k) => hintedSet.has(k));
      if (alreadyHinted) continue;
      setPersisted((prev) => ({
        ...prev,
        hintedCells: [...new Set([...prev.hintedCells, ...allCellKeys])],
        hints: prev.hints - 1,
      }));
      flashMessage(`Hint revealed — ${wp.word.length} letters`);
      return;
    }
    flashMessage('No more hints available');
  }, [persisted.hints, persisted.foundWords, puzzle.themeWords, puzzle.spangram, hintedSet, setPersisted, flashMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedCells.length > 0) submitWord();
      }
      if (e.key === 'Escape') {
        setSelectedCells([]);
      }
    },
    [selectedCells, submitWord]
  );

  const getCellBg = (r: number, c: number): string => {
    const status = foundCellsMap.get(cellKey(r, c));
    if (status === 'spangram') return 'bg-amber-400/70 text-amber-950';
    if (status === 'theme') return 'bg-sky-400/70 text-sky-950';
    if (isSelected(r, c)) return 'bg-sky-200/40 text-white ring-2 ring-sky-400';
    if (hintedSet.has(cellKey(r, c))) return 'bg-purple-500/40 text-purple-100 ring-1 ring-purple-300';
    return 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600';
  };

  // ---- SVG path overlay --------------------------------------------------
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellMetrics, setCellMetrics] = useState<{ size: number; gap: number }>({ size: 0, gap: 0 });

  useEffect(() => {
    if (!gridRef.current) return;
    const measure = () => {
      if (!gridRef.current) return;
      const firstCell = gridRef.current.querySelector<HTMLButtonElement>('button[data-strands-cell]');
      if (!firstCell) return;
      const size = firstCell.offsetWidth;
      const gridStyle = window.getComputedStyle(gridRef.current);
      const gap = parseFloat(gridStyle.gap || '0');
      setCellMetrics({ size, gap });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, [puzzle.grid]);

  const cellCenter = useCallback(
    (r: number, c: number) => {
      const { size, gap } = cellMetrics;
      const x = c * (size + gap) + size / 2;
      const y = r * (size + gap) + size / 2;
      return { x, y };
    },
    [cellMetrics]
  );

  const buildPath = (cells: [number, number][]) => {
    if (cells.length < 1 || cellMetrics.size === 0) return '';
    return cells
      .map(([r, c], i) => {
        const { x, y } = cellCenter(r, c);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
  };

  const shareText = useMemo(
    () => buildStrandsShare(puzzleIndex + 1, persisted.shareSequence),
    [puzzleIndex, persisted.shareSequence]
  );

  return (
    <div
      className="flex flex-col items-center px-4 py-6 text-[var(--foreground)] outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <GameHeader
        game="strands"
        title="SA Strands"
        subtitle={`Puzzle #${puzzleIndex + 1}`}
      />

      <div className="mt-2 text-center">
        <div className="text-lg font-semibold text-amber-300">{puzzle.theme}</div>
        <div className="text-sm text-[var(--foreground)]/60">{puzzle.themeHint}</div>
      </div>

      <div className="flex gap-2 mt-3 mb-3 text-sm text-[var(--foreground)]/70">
        <span>Found: {totalFound}/{totalToFind}</span>
        <span aria-hidden="true">|</span>
        <span>Hints: {persisted.hints}</span>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>
      {message && (
        <div className="mb-3 px-4 py-1.5 bg-zinc-700/80 rounded-lg text-sm text-[var(--foreground)]" role="alert">
          {message}
        </div>
      )}

      {won && (
        <div role="status" className="mb-4 px-4 py-2 bg-green-800/60 rounded-lg text-green-200 font-semibold">
          Lekker! You found every strand!
        </div>
      )}

      <div
        className="relative"
        style={{ width: 'min(384px, 94vw)' }}
      >
        <div
          ref={gridRef}
          className={`grid gap-1.5 ${shakeSelection ? 'animate-shake' : ''}`}
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          role="grid"
          aria-label="Strands letter grid"
        >
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = cellKey(r, c);
              const status = foundCellsMap.get(key);
              const isPopping = popCell === key;
              const isCelebrating = celebrateCells.has(key);
              return (
                <button
                  key={`${r}-${c}`}
                  data-strands-cell
                  onClick={() => handleCellClick(r, c)}
                  disabled={!!status}
                  aria-pressed={isSelected(r, c)}
                  aria-label={`Row ${r + 1} column ${c + 1} letter ${letter}`}
                  className={`aspect-square flex items-center justify-center rounded-full font-bold text-base sm:text-lg transition-all select-none focus:outline-none focus:ring-2 focus:ring-[var(--game-green)] ${getCellBg(r, c)} ${
                    status ? 'cursor-default' : 'cursor-pointer active:scale-95'
                  } ${isPopping ? 'animate-pop' : ''} ${isCelebrating ? 'animate-celebrate' : ''}`}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>

        {cellMetrics.size > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* Found-word paths (dim, persistent) */}
            {persisted.foundCells.length > 0 && null}
            {puzzle.themeWords.map((tw) => {
              if (!persisted.foundWords.includes(tw.word.toUpperCase())) return null;
              return (
                <path
                  key={`tw-${tw.word}`}
                  d={buildPath(tw.cells)}
                  fill="none"
                  stroke="rgba(56,189,248,0.7)"
                  strokeWidth={cellMetrics.size * 0.55}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {persisted.foundSpangram && (
              <path
                d={buildPath(puzzle.spangram.cells)}
                fill="none"
                stroke="rgba(251,191,36,0.75)"
                strokeWidth={cellMetrics.size * 0.55}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* In-progress selection */}
            {selectedCells.length >= 2 && (
              <path
                d={buildPath(selectedCells)}
                fill="none"
                stroke="rgba(125,211,252,0.85)"
                strokeWidth={cellMetrics.size * 0.18}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${cellMetrics.size * 0.1} ${cellMetrics.size * 0.1}`}
              />
            )}
          </svg>
        )}
      </div>

      <div className="flex gap-3 mt-6 mb-4 flex-wrap justify-center">
        <button
          onClick={() => setSelectedCells([])}
          disabled={selectedCells.length === 0}
          className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
        >
          Clear
        </button>
        <button
          onClick={submitWord}
          disabled={selectedCells.length < 3 || won}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
        >
          Submit
        </button>
        <button
          onClick={handleHint}
          disabled={persisted.hints <= 0 || won}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
        >
          Hint ({persisted.hints})
        </button>
      </div>

      {persisted.foundWords.length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-sm font-bold text-[var(--foreground)]/60 mb-2 uppercase tracking-wider">
            Found Words
          </h3>
          <div className="flex flex-wrap gap-2">
            {persisted.foundWords.map((word, i) => {
              const isSpan = word.toUpperCase() === puzzle.spangram.word.toUpperCase();
              return (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isSpan ? 'bg-amber-400/30 text-amber-200' : 'bg-sky-400/30 text-sky-100'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Strands solved!"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground)]/80">
            You unspooled every strand — sharp sharp!
          </p>
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
