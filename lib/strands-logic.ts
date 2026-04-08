export type WordPath = {
  word: string;
  cells: [number, number][];
};

export type StrandsPuzzle = {
  theme: string;
  themeHint: string;
  grid: string[][];
  spangram: WordPath;
  themeWords: WordPath[];
};

export type StrandsState = {
  selectedCells: [number, number][];
  foundWords: string[];
  foundSpangram: boolean;
  hints: number;
  nonThemeCount: number;
  gameStatus: 'playing' | 'won';
};

export function isAdjacent(
  cell1: [number, number],
  cell2: [number, number]
): boolean {
  const rowDiff = Math.abs(cell1[0] - cell2[0]);
  const colDiff = Math.abs(cell1[1] - cell2[1]);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

export function getWordFromCells(
  grid: string[][],
  cells: [number, number][]
): string {
  return cells.map(([r, c]) => grid[r][c]).join('');
}

export function checkWord(
  word: string,
  cells: [number, number][],
  puzzle: StrandsPuzzle
): {
  isTheme: boolean;
  isSpangram: boolean;
  isValid: boolean;
  wordPath?: WordPath;
} {
  const upperWord = word.toUpperCase();

  if (upperWord === puzzle.spangram.word.toUpperCase()) {
    const spanCells = puzzle.spangram.cells;
    if (cellsMatch(cells, spanCells)) {
      return { isTheme: false, isSpangram: true, isValid: true, wordPath: puzzle.spangram };
    }
  }

  for (const tw of puzzle.themeWords) {
    if (upperWord === tw.word.toUpperCase()) {
      if (cellsMatch(cells, tw.cells)) {
        return { isTheme: true, isSpangram: false, isValid: true, wordPath: tw };
      }
    }
  }

  if (word.length >= 4) {
    return { isTheme: false, isSpangram: false, isValid: true };
  }

  return { isTheme: false, isSpangram: false, isValid: false };
}

function cellsMatch(
  userCells: [number, number][],
  puzzleCells: [number, number][]
): boolean {
  if (userCells.length !== puzzleCells.length) return false;
  const userSet = new Set(userCells.map(([r, c]) => `${r},${c}`));
  const puzzleSet = new Set(puzzleCells.map(([r, c]) => `${r},${c}`));
  for (const cell of userSet) {
    if (!puzzleSet.has(cell)) return false;
  }
  return true;
}

export function canEarnHint(nonThemeCount: number): boolean {
  return nonThemeCount > 0 && nonThemeCount % 3 === 0;
}
