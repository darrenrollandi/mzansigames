export type Clue = {
  number: number;
  clue: string;
  answer: string;
  row: number;
  col: number;
  length: number;
};

export type MiniPuzzle = {
  grid: string[][];
  across: Clue[];
  down: Clue[];
};

export type CellState = {
  letter: string;
  isBlack: boolean;
  isCorrect?: boolean;
  isRevealed?: boolean;
  clueNumbers: number[];
};

export function initializeGrid(puzzle: MiniPuzzle): CellState[][] {
  const grid: CellState[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < 5; c++) {
      const isBlack = puzzle.grid[r][c] === '#';
      const clueNumbers: number[] = [];
      for (const clue of [...puzzle.across, ...puzzle.down]) {
        if (clue.row === r && clue.col === c) {
          if (!clueNumbers.includes(clue.number)) {
            clueNumbers.push(clue.number);
          }
        }
      }
      row.push({
        letter: '',
        isBlack,
        isCorrect: undefined,
        isRevealed: false,
        clueNumbers,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function checkCell(userLetter: string, correctLetter: string): boolean {
  return userLetter.toUpperCase() === correctLetter.toUpperCase();
}

export function checkAll(userGrid: string[][], puzzle: MiniPuzzle): boolean[][] {
  const result: boolean[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < 5; c++) {
      if (puzzle.grid[r][c] === '#') {
        row.push(true);
      } else {
        row.push(checkCell(userGrid[r][c] || '', puzzle.grid[r][c]));
      }
    }
    result.push(row);
  }
  return result;
}

export function isComplete(userGrid: string[][], puzzle: MiniPuzzle): boolean {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (puzzle.grid[r][c] === '#') continue;
      if (!userGrid[r][c] || userGrid[r][c].toUpperCase() !== puzzle.grid[r][c].toUpperCase()) {
        return false;
      }
    }
  }
  return true;
}
