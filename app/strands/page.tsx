'use client';

import { useState, useCallback } from 'react';
import { getPuzzleIndex } from '@/lib/puzzle-generator';
import { isAdjacent, getWordFromCells, checkWord, canEarnHint } from '@/lib/strands-logic';
import type { StrandsPuzzle, WordPath } from '@/lib/strands-logic';
import puzzles from '@/data/strands-themes.json';

type CellStatus = 'default' | 'selected' | 'theme' | 'spangram';

export default function StrandsPage() {
  const puzzleIndex = getPuzzleIndex(new Date(), puzzles.length);
  const puzzle = puzzles[puzzleIndex] as unknown as StrandsPuzzle;
  const ROWS = puzzle.grid.length;
  const COLS = puzzle.grid[0].length;

  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundSpangram, setFoundSpangram] = useState(false);
  const [foundCells, setFoundCells] = useState<Map<string, CellStatus>>(new Map());
  const [hints, setHints] = useState(0);
  const [nonThemeCount, setNonThemeCount] = useState(0);
  const [hintedCells, setHintedCells] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [won, setWon] = useState(false);
  const [shakeSelection, setShakeSelection] = useState(false);

  const cellKey = (r: number, c: number) => `${r},${c}`;

  const getCellStatus = (r: number, c: number): CellStatus => {
    return foundCells.get(cellKey(r, c)) || 'default';
  };

  const isSelected = (r: number, c: number): boolean => {
    return selectedCells.some(([sr, sc]) => sr === r && sc === c);
  };

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (won) return;
      if (foundCells.has(cellKey(row, col))) return;

      // If clicking last selected cell, submit
      if (
        selectedCells.length > 0 &&
        selectedCells[selectedCells.length - 1][0] === row &&
        selectedCells[selectedCells.length - 1][1] === col
      ) {
        submitWord();
        return;
      }

      // If already in selection, deselect back to that point
      const existingIdx = selectedCells.findIndex(([r, c]) => r === row && c === col);
      if (existingIdx >= 0) {
        setSelectedCells(selectedCells.slice(0, existingIdx + 1));
        return;
      }

      // Check adjacency
      if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (!isAdjacent(last, [row, col])) {
          // Start new selection
          setSelectedCells([[row, col]]);
          return;
        }
      }

      setSelectedCells([...selectedCells, [row, col]]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCells, foundCells, won]
  );

  const submitWord = useCallback(() => {
    if (selectedCells.length < 3) {
      flashMessage('Too short');
      setSelectedCells([]);
      return;
    }

    const word = getWordFromCells(puzzle.grid, selectedCells);
    const result = checkWord(word, selectedCells, puzzle);

    if (result.isSpangram && result.wordPath) {
      // Found the spangram!
      const newFound = new Map(foundCells);
      for (const [r, c] of result.wordPath.cells) {
        newFound.set(cellKey(r, c), 'spangram');
      }
      setFoundCells(newFound);
      setFoundSpangram(true);
      setFoundWords([...foundWords, word]);
      flashMessage('Spangram found!');
      checkWin([...foundWords, word], true);
    } else if (result.isTheme && result.wordPath) {
      // Found a theme word
      const newFound = new Map(foundCells);
      for (const [r, c] of result.wordPath.cells) {
        newFound.set(cellKey(r, c), 'theme');
      }
      setFoundCells(newFound);
      setFoundWords([...foundWords, word]);
      flashMessage(`"${word}" found!`);
      checkWin([...foundWords, word], foundSpangram);
    } else if (result.isValid) {
      // Valid word but not theme
      const newCount = nonThemeCount + 1;
      setNonThemeCount(newCount);
      if (canEarnHint(newCount)) {
        setHints((h) => h + 1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCells, puzzle, foundCells, foundWords, foundSpangram, nonThemeCount]);

  const checkWin = (words: string[], spangramFound: boolean) => {
    const totalNeeded = puzzle.themeWords.length + 1; // +1 for spangram
    const totalFound = words.length;
    if (totalFound >= totalNeeded && spangramFound) {
      setWon(true);
      flashMessage('You found all the words!');
    }
  };

  const flashMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2500);
  };

  const triggerShake = () => {
    setShakeSelection(true);
    setTimeout(() => setShakeSelection(false), 500);
  };

  const handleHint = () => {
    if (hints <= 0) return;
    // Find an unfound theme word and highlight its first cell
    const allWords = [...puzzle.themeWords, puzzle.spangram];
    for (const wp of allWords) {
      if (!foundWords.includes(wp.word.toUpperCase()) && !foundWords.includes(wp.word)) {
        const [r, c] = wp.cells[0];
        const key = cellKey(r, c);
        if (!hintedCells.has(key)) {
          setHintedCells(new Set([...hintedCells, key]));
          setHints((h) => h - 1);
          flashMessage(`Hint: look near row ${r + 1}, col ${c + 1}`);
          return;
        }
      }
    }
    flashMessage('No more hints available');
  };

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
    const status = getCellStatus(r, c);
    if (status === 'spangram') return 'bg-yellow-500/60 text-yellow-100';
    if (status === 'theme') return 'bg-blue-500/50 text-blue-100';
    if (isSelected(r, c)) return 'bg-sky-400/40 text-white';
    if (hintedCells.has(cellKey(r, c))) return 'bg-purple-500/30 text-purple-200';
    return 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600';
  };

  const totalToFind = puzzle.themeWords.length + 1;
  const totalFound = foundWords.length;

  return (
    <div
      className="flex flex-col items-center px-4 py-8 min-h-screen outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <h1 className="text-2xl font-bold mb-1">SA Strands</h1>
      <p className="text-zinc-400 mb-2 text-sm">Puzzle #{puzzleIndex + 1}</p>

      {/* Theme */}
      <div className="mb-4 text-center">
        <div className="text-lg font-semibold text-amber-300">{puzzle.theme}</div>
        <div className="text-sm text-zinc-400">{puzzle.themeHint}</div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-3 text-sm text-zinc-400">
        <span>Found: {totalFound}/{totalToFind}</span>
        <span>|</span>
        <span>Hints: {hints}</span>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-3 px-4 py-1.5 bg-zinc-700/80 rounded-lg text-sm text-zinc-200 animate-pulse">
          {message}
        </div>
      )}

      {won && (
        <div className="mb-4 px-4 py-2 bg-green-800/60 rounded-lg text-green-200 font-semibold">
          Congratulations! You found all the strands!
        </div>
      )}

      {/* Grid */}
      <div
        className={`grid gap-1 mb-6 ${shakeSelection ? 'animate-pulse' : ''}`}
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          width: 'min(360px, 92vw)',
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              disabled={foundCells.has(cellKey(r, c))}
              className={`aspect-square flex items-center justify-center rounded-md font-bold text-base sm:text-lg transition-all select-none ${getCellBg(r, c)} ${
                foundCells.has(cellKey(r, c)) ? 'cursor-default' : 'cursor-pointer active:scale-95'
              }`}
            >
              {letter}
            </button>
          ))
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setSelectedCells([])}
          disabled={selectedCells.length === 0}
          className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          Clear
        </button>
        <button
          onClick={submitWord}
          disabled={selectedCells.length < 3 || won}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          Submit
        </button>
        <button
          onClick={handleHint}
          disabled={hints <= 0 || won}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          Hint ({hints})
        </button>
      </div>

      {/* Found words */}
      {foundWords.length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Found Words</h3>
          <div className="flex flex-wrap gap-2">
            {foundWords.map((word, i) => {
              const isSpan = word.toUpperCase() === puzzle.spangram.word.toUpperCase();
              return (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isSpan ? 'bg-yellow-500/30 text-yellow-200' : 'bg-blue-500/30 text-blue-200'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
