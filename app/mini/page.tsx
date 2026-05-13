'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPuzzleIndex } from '@/lib/puzzle-generator';
import { initializeGrid, checkAll, isComplete } from '@/lib/mini-logic';
import type { MiniPuzzle, Clue, CellState } from '@/lib/mini-logic';
import puzzles from '@/data/mini-clues.json';
import GameHeader from '@/components/GameHeader';
import Modal from '@/components/Modal';
import ShareButton from '@/components/ShareButton';
import { useDailyState } from '@/lib/storage';
import { useGameStats, winPercent } from '@/lib/stats';
import { buildMiniShare } from '@/lib/share';

type Direction = 'across' | 'down';

type Persisted = {
  userGrid: string[][];
  revealedCells: string[]; // "r,c" strings
  reportedResult: boolean;
  hadHelp: boolean;
};

const EMPTY_GRID = (): string[][] =>
  Array.from({ length: 5 }, () => Array(5).fill(''));

export default function MiniCrosswordPage() {
  const { puzzle, puzzleIndex } = useMemo(() => {
    const idx = getPuzzleIndex(new Date(), puzzles.length);
    return { puzzle: puzzles[idx] as MiniPuzzle, puzzleIndex: idx };
  }, []);

  const [persisted, setPersisted, hydrated] = useDailyState<Persisted>(
    `mini-${puzzleIndex}`,
    { userGrid: EMPTY_GRID(), revealedCells: [], reportedResult: false, hadHelp: false }
  );

  const userGrid = persisted.userGrid;
  const revealedSet = useMemo(() => new Set(persisted.revealedCells), [persisted.revealedCells]);

  const cellStates: CellState[][] = useMemo(() => {
    const base = initializeGrid(puzzle);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        base[r][c].letter = userGrid[r][c] ?? '';
        if (revealedSet.has(`${r},${c}`)) base[r][c].isRevealed = true;
      }
    }
    return base;
  }, [puzzle, userGrid, revealedSet]);

  const [selectedCell, setSelectedCell] = useState<[number, number]>(() => {
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) if (puzzle.grid[r][c] !== '#') return [r, c] as [number, number];
    return [0, 0];
  });
  const [direction, setDirection] = useState<Direction>('across');
  const [checked, setChecked] = useState(false);
  const [checkResults, setCheckResults] = useState<boolean[][] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const won = useMemo(() => isComplete(userGrid, puzzle), [userGrid, puzzle]);

  const { stats, recordResult } = useGameStats('mini');

  useEffect(() => {
    if (!hydrated) return;
    if (won) setModalOpen(true);
    // Only auto-open when state loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Record stats once.
  useEffect(() => {
    if (!hydrated) return;
    if (persisted.reportedResult) return;
    if (won) {
      recordResult('won');
      setPersisted((p) => ({ ...p, reportedResult: true }));
    }
  }, [hydrated, won, persisted.reportedResult, recordResult, setPersisted]);

  const findClue = useCallback(
    (row: number, col: number, dir: Direction): Clue | null => {
      const clues = dir === 'across' ? puzzle.across : puzzle.down;
      for (const clue of clues) {
        if (dir === 'across') {
          if (row === clue.row && col >= clue.col && col < clue.col + clue.length) return clue;
        } else {
          if (col === clue.col && row >= clue.row && row < clue.row + clue.length) return clue;
        }
      }
      return null;
    },
    [puzzle]
  );

  // Derived (no setState in effect)
  const selectedClue = findClue(selectedCell[0], selectedCell[1], direction);

  const getClueCells = useCallback((clue: Clue, dir: Direction): [number, number][] => {
    const cells: [number, number][] = [];
    for (let i = 0; i < clue.length; i++) {
      if (dir === 'across') cells.push([clue.row, clue.col + i]);
      else cells.push([clue.row + i, clue.col]);
    }
    return cells;
  }, []);

  const handleCellClick = (row: number, col: number) => {
    if (puzzle.grid[row][col] === '#') return;
    if (row === selectedCell[0] && col === selectedCell[1]) {
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell([row, col]);
    }
    setChecked(false);
    setCheckResults(null);
    gridRef.current?.focus();
  };

  const handleClueClick = (clue: Clue, dir: Direction) => {
    setDirection(dir);
    setSelectedCell([clue.row, clue.col]);
    setChecked(false);
    setCheckResults(null);
    gridRef.current?.focus();
  };

  const setLetter = useCallback(
    (row: number, col: number, letter: string) => {
      setPersisted((prev) => {
        const next = prev.userGrid.map((r) => [...r]);
        next[row][col] = letter;
        return { ...prev, userGrid: next };
      });
    },
    [setPersisted]
  );

  const moveCell = useCallback(
    (dr: number, dc: number) => {
      const [row, col] = selectedCell;
      if (dr === 0 && dc !== 0) {
        for (let c = col + dc; c >= 0 && c < 5; c += dc) {
          if (puzzle.grid[row][c] !== '#') { setSelectedCell([row, c]); return; }
        }
      } else if (dc === 0 && dr !== 0) {
        for (let r = row + dr; r >= 0 && r < 5; r += dr) {
          if (puzzle.grid[r][col] !== '#') { setSelectedCell([r, col]); return; }
        }
      }
    },
    [selectedCell, puzzle.grid]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (won) return;
      const [row, col] = selectedCell;

      if (e.key === 'Tab') {
        e.preventDefault();
        setDirection((d) => (d === 'across' ? 'down' : 'across'));
        return;
      }

      if (e.key === 'ArrowRight') { e.preventDefault(); moveCell(0, 1); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); moveCell(0, -1); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); moveCell(1, 0); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); moveCell(-1, 0); return; }

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (userGrid[row][col]) {
          setLetter(row, col, '');
        } else if (direction === 'across') {
          moveCell(0, -1);
        } else {
          moveCell(-1, 0);
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        const letter = e.key.toUpperCase();
        setLetter(row, col, letter);
        // After typing, advance one cell in the active direction.
        if (direction === 'across') moveCell(0, 1);
        else moveCell(1, 0);
      }
    },
    [selectedCell, userGrid, won, moveCell, setLetter, direction]
  );

  const handleCheck = () => {
    const results = checkAll(userGrid, puzzle);
    setCheckResults(results);
    setChecked(true);
  };

  const handleReveal = () => {
    if (!selectedClue) return;
    const cells = getClueCells(selectedClue, direction);
    setPersisted((prev) => {
      const next = prev.userGrid.map((r) => [...r]);
      const revealed = new Set(prev.revealedCells);
      for (const [r, c] of cells) {
        next[r][c] = puzzle.grid[r][c];
        revealed.add(`${r},${c}`);
      }
      return {
        ...prev,
        userGrid: next,
        revealedCells: [...revealed],
        hadHelp: true,
      };
    });
  };

  const isHighlighted = (row: number, col: number): boolean => {
    if (!selectedClue) return false;
    const cells = getClueCells(selectedClue, direction);
    return cells.some(([r, c]) => r === row && c === col);
  };

  const getCellBg = (row: number, col: number): string => {
    if (puzzle.grid[row][col] === '#') return 'bg-[var(--game-grey)]';
    if (won) return 'bg-[var(--game-green)]/40';
    if (checked && checkResults) {
      if (userGrid[row][col] && !checkResults[row][col]) return 'bg-red-700/40';
    }
    if (cellStates[row][col].isRevealed) return 'bg-amber-700/30';
    if (row === selectedCell[0] && col === selectedCell[1]) return 'bg-[var(--game-yellow)]/50';
    if (isHighlighted(row, col)) return 'bg-blue-500/30';
    return 'bg-zinc-700';
  };

  const shareText = useMemo(
    () => buildMiniShare(puzzleIndex + 1, persisted.hadHelp),
    [puzzleIndex, persisted.hadHelp]
  );

  return (
    <div className="flex flex-col items-center px-4 py-6 text-[var(--foreground)]">
      <GameHeader
        game="mini"
        title="SA Mini Crossword"
        subtitle={`Puzzle #${puzzleIndex + 1}`}
      />

      {won && (
        <div
          role="status"
          className="mt-3 mb-2 px-4 py-2 bg-green-800/60 rounded-lg text-green-200 font-semibold"
        >
          Congratulations! You solved it!
        </div>
      )}

      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="grid"
        aria-label="Mini crossword grid"
        className="grid grid-cols-5 gap-0.5 mt-4 mb-6 outline-none rounded-md focus:ring-2 focus:ring-[var(--game-green)]"
        style={{ width: 'min(360px, 92vw)', height: 'min(360px, 92vw)' }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const isBlack = cell === '#';
            const clueNums = cellStates[r][c].clueNumbers;
            const selected = r === selectedCell[0] && c === selectedCell[1];
            return (
              <div
                key={`${r}-${c}`}
                role="gridcell"
                aria-selected={selected}
                aria-label={
                  isBlack ? 'block' : `row ${r + 1} column ${c + 1}${userGrid[r][c] ? ` letter ${userGrid[r][c]}` : ''}`
                }
                onClick={() => handleCellClick(r, c)}
                className={`relative flex items-center justify-center border border-[var(--tile-border)] select-none font-bold text-lg ${getCellBg(r, c)} ${isBlack ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ aspectRatio: '1' }}
              >
                {clueNums.length > 0 && (
                  <span className="absolute top-0.5 left-1 text-[9px] text-zinc-300 leading-none">
                    {clueNums[0]}
                  </span>
                )}
                {!isBlack && (
                  <span className={cellStates[r][c].isRevealed ? 'text-amber-300' : 'text-white'}>
                    {userGrid[r][c]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-3 mb-2 flex-wrap justify-center">
        <button
          onClick={handleCheck}
          disabled={won}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
        >
          Check
        </button>
        <button
          onClick={handleReveal}
          disabled={won || !selectedClue}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--game-green)]"
        >
          Reveal Word
        </button>
      </div>

      {selectedClue && (
        <p className="text-sm text-[var(--foreground)]/80 mt-2 max-w-md text-center">
          <span className="font-semibold mr-1 uppercase text-xs tracking-wider text-[var(--foreground)]/60">
            {direction}
          </span>
          {selectedClue.number}. {selectedClue.clue}
        </p>
      )}

      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <div>
          <h3 className="font-bold text-sm mb-2 text-[var(--foreground)]/70 uppercase tracking-wider">Across</h3>
          <ul className="space-y-1">
            {puzzle.across.map((clue) => (
              <li
                key={`a${clue.number}`}
                onClick={() => handleClueClick(clue, 'across')}
                className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${
                  selectedClue === clue && direction === 'across'
                    ? 'bg-blue-500/30 text-white'
                    : 'text-[var(--foreground)]/80 hover:bg-zinc-700/50'
                }`}
              >
                <span className="font-semibold mr-1">{clue.number}.</span>
                {clue.clue}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2 text-[var(--foreground)]/70 uppercase tracking-wider">Down</h3>
          <ul className="space-y-1">
            {puzzle.down.map((clue) => (
              <li
                key={`d${clue.number}`}
                onClick={() => handleClueClick(clue, 'down')}
                className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${
                  selectedClue === clue && direction === 'down'
                    ? 'bg-blue-500/30 text-white'
                    : 'text-[var(--foreground)]/80 hover:bg-zinc-700/50'
                }`}
              >
                <span className="font-semibold mr-1">{clue.number}.</span>
                {clue.clue}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Solved!"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground)]/80">
            Lekker! You cracked today&apos;s mini.
            {persisted.hadHelp && ' (You used a reveal — still counts!)'}
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
