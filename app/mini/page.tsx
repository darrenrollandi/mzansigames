'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPuzzleIndex } from '@/lib/puzzle-generator';
import { initializeGrid, checkAll, isComplete } from '@/lib/mini-logic';
import type { MiniPuzzle, Clue, CellState } from '@/lib/mini-logic';
import puzzles from '@/data/mini-clues.json';

type Direction = 'across' | 'down';

export default function MiniCrosswordPage() {
  const puzzleIndex = getPuzzleIndex(new Date(), puzzles.length);
  const puzzle = puzzles[puzzleIndex] as MiniPuzzle;

  const [cellStates, setCellStates] = useState<CellState[][]>(() => initializeGrid(puzzle));
  const [userGrid, setUserGrid] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => Array(5).fill(''))
  );
  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0]);
  const [direction, setDirection] = useState<Direction>('across');
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [checked, setChecked] = useState(false);
  const [won, setWon] = useState(false);
  const [checkResults, setCheckResults] = useState<boolean[][] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Find the clue for current selection
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

  // Get cells belonging to a clue
  const getClueCells = useCallback((clue: Clue, dir: Direction): [number, number][] => {
    const cells: [number, number][] = [];
    for (let i = 0; i < clue.length; i++) {
      if (dir === 'across') cells.push([clue.row, clue.col + i]);
      else cells.push([clue.row + i, clue.col]);
    }
    return cells;
  }, []);

  // Update selected clue when cell/direction changes
  useEffect(() => {
    const clue = findClue(selectedCell[0], selectedCell[1], direction);
    setSelectedClue(clue);
  }, [selectedCell, direction, findClue]);

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
    setSelectedClue(clue);
    setChecked(false);
    setCheckResults(null);
    gridRef.current?.focus();
  };

  const moveToNextCell = useCallback(
    (row: number, col: number) => {
      if (direction === 'across') {
        for (let c = col + 1; c < 5; c++) {
          if (puzzle.grid[row][c] !== '#') {
            setSelectedCell([row, c]);
            return;
          }
        }
      } else {
        for (let r = row + 1; r < 5; r++) {
          if (puzzle.grid[r][col] !== '#') {
            setSelectedCell([r, col]);
            return;
          }
        }
      }
    },
    [direction, puzzle.grid]
  );

  const moveToPrevCell = useCallback(
    (row: number, col: number) => {
      if (direction === 'across') {
        for (let c = col - 1; c >= 0; c--) {
          if (puzzle.grid[row][c] !== '#') {
            setSelectedCell([row, c]);
            return;
          }
        }
      } else {
        for (let r = row - 1; r >= 0; r--) {
          if (puzzle.grid[r][col] !== '#') {
            setSelectedCell([r, col]);
            return;
          }
        }
      }
    },
    [direction, puzzle.grid]
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

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        for (let c = col + 1; c < 5; c++) {
          if (puzzle.grid[row][c] !== '#') { setSelectedCell([row, c]); return; }
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        for (let c = col - 1; c >= 0; c--) {
          if (puzzle.grid[row][c] !== '#') { setSelectedCell([row, c]); return; }
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        for (let r = row + 1; r < 5; r++) {
          if (puzzle.grid[r][col] !== '#') { setSelectedCell([r, col]); return; }
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        for (let r = row - 1; r >= 0; r--) {
          if (puzzle.grid[r][col] !== '#') { setSelectedCell([r, col]); return; }
        }
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (userGrid[row][col]) {
          const newGrid = userGrid.map((r) => [...r]);
          newGrid[row][col] = '';
          setUserGrid(newGrid);
          const newStates = cellStates.map((r) => r.map((c) => ({ ...c })));
          newStates[row][col].letter = '';
          newStates[row][col].isCorrect = undefined;
          setCellStates(newStates);
        } else {
          moveToPrevCell(row, col);
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        const letter = e.key.toUpperCase();
        const newGrid = userGrid.map((r) => [...r]);
        newGrid[row][col] = letter;
        setUserGrid(newGrid);

        const newStates = cellStates.map((r) => r.map((c) => ({ ...c })));
        newStates[row][col].letter = letter;
        newStates[row][col].isCorrect = undefined;
        setCellStates(newStates);

        if (isComplete(newGrid, puzzle)) {
          setWon(true);
        } else {
          moveToNextCell(row, col);
        }
      }
    },
    [selectedCell, userGrid, cellStates, puzzle, won, moveToNextCell, moveToPrevCell]
  );

  const handleCheck = () => {
    const results = checkAll(userGrid, puzzle);
    setCheckResults(results);
    setChecked(true);
  };

  const handleReveal = () => {
    if (!selectedClue) return;
    const cells = getClueCells(selectedClue, direction);
    const newGrid = userGrid.map((r) => [...r]);
    const newStates = cellStates.map((r) => r.map((c) => ({ ...c })));

    for (const [r, c] of cells) {
      newGrid[r][c] = puzzle.grid[r][c];
      newStates[r][c].letter = puzzle.grid[r][c];
      newStates[r][c].isRevealed = true;
      newStates[r][c].isCorrect = true;
    }

    setUserGrid(newGrid);
    setCellStates(newStates);

    if (isComplete(newGrid, puzzle)) {
      setWon(true);
    }
  };

  const isHighlighted = (row: number, col: number): boolean => {
    if (!selectedClue) return false;
    const cells = getClueCells(selectedClue, direction);
    return cells.some(([r, c]) => r === row && c === col);
  };

  const getCellBg = (row: number, col: number): string => {
    if (puzzle.grid[row][col] === '#') return 'bg-zinc-800';
    if (won) return 'bg-green-700/40';
    if (checked && checkResults) {
      if (userGrid[row][col] && !checkResults[row][col]) return 'bg-red-700/40';
    }
    if (cellStates[row][col].isRevealed) return 'bg-amber-700/30';
    if (row === selectedCell[0] && col === selectedCell[1]) return 'bg-yellow-500/50';
    if (isHighlighted(row, col)) return 'bg-blue-500/30';
    return 'bg-zinc-700';
  };

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-screen">
      <h1 className="text-2xl font-bold mb-1">SA Mini Crossword</h1>
      <p className="text-zinc-400 mb-4 text-sm">Puzzle #{puzzleIndex + 1}</p>

      {won && (
        <div className="mb-4 px-4 py-2 bg-green-800/60 rounded-lg text-green-200 font-semibold">
          Congratulations! You solved it!
        </div>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-5 gap-0.5 mb-6 outline-none"
        style={{ width: 'min(350px, 90vw)', height: 'min(350px, 90vw)' }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const isBlack = cell === '#';
            const clueNums = cellStates[r][c].clueNumbers;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`relative flex items-center justify-center border border-zinc-600 cursor-pointer select-none font-bold text-lg ${getCellBg(r, c)} ${isBlack ? 'cursor-default' : ''}`}
                style={{ aspectRatio: '1' }}
              >
                {clueNums.length > 0 && (
                  <span className="absolute top-0.5 left-1 text-[9px] text-zinc-400 leading-none">
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

      {/* Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCheck}
          disabled={won}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          Check
        </button>
        <button
          onClick={handleReveal}
          disabled={won || !selectedClue}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          Reveal Word
        </button>
      </div>

      {/* Clues */}
      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-sm mb-2 text-zinc-300 uppercase tracking-wider">Across</h3>
          <ul className="space-y-1">
            {puzzle.across.map((clue) => (
              <li
                key={`a${clue.number}`}
                onClick={() => handleClueClick(clue, 'across')}
                className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${
                  selectedClue === clue && direction === 'across'
                    ? 'bg-blue-500/30 text-white'
                    : 'text-zinc-300 hover:bg-zinc-700/50'
                }`}
              >
                <span className="font-semibold mr-1">{clue.number}.</span>
                {clue.clue}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2 text-zinc-300 uppercase tracking-wider">Down</h3>
          <ul className="space-y-1">
            {puzzle.down.map((clue) => (
              <li
                key={`d${clue.number}`}
                onClick={() => handleClueClick(clue, 'down')}
                className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${
                  selectedClue === clue && direction === 'down'
                    ? 'bg-blue-500/30 text-white'
                    : 'text-zinc-300 hover:bg-zinc-700/50'
                }`}
              >
                <span className="font-semibold mr-1">{clue.number}.</span>
                {clue.clue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
