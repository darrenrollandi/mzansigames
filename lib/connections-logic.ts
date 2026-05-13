import { seededShuffle } from '@/lib/puzzle-generator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Group = {
  category: string;
  difficulty: number;   // 1 = yellow (easiest) … 4 = purple (hardest)
  words: string[];
};

export type Puzzle = {
  groups: Group[];
};

export type GameState = {
  remainingWords: string[];
  solvedGroups: Group[];
  mistakes: number;
  selectedWords: string[];
  gameStatus: 'playing' | 'won' | 'lost';
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Plain Fisher-Yates with Math.random (for the Shuffle button). */
export function shuffleWords(words: string[]): string[] {
  const copy = [...words];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Build the initial game state from a puzzle.
 * Words are shuffled deterministically using the current date as seed.
 */
export function initializeGame(puzzle: Puzzle): GameState {
  const allWords = puzzle.groups.flatMap((g) => g.words);
  const seed = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 8);
  const shuffled = seededShuffle(allWords, parseInt(seed, 10));

  return {
    remainingWords: shuffled,
    solvedGroups: [],
    mistakes: 0,
    selectedWords: [],
    gameStatus: 'playing',
  };
}

/**
 * Check whether four selected words form one of the puzzle groups.
 *
 * Returns:
 * - `correct: true` + the matched `group` when all 4 words belong to the same group.
 * - `correct: false` + `isOneAway: true` when exactly 3 of the 4 words belong
 *   to a single group.
 * - `correct: false` otherwise.
 */
export function checkGuess(
  selected: string[],
  puzzle: Puzzle,
): { correct: boolean; group?: Group; isOneAway?: boolean } {
  if (selected.length !== 4) {
    return { correct: false };
  }

  for (const group of puzzle.groups) {
    const groupSet = new Set(group.words);
    const overlap = selected.filter((w) => groupSet.has(w)).length;

    if (overlap === 4) {
      return { correct: true, group };
    }
  }

  // Check for "one away" — exactly 3 of the 4 belong to one group
  for (const group of puzzle.groups) {
    const groupSet = new Set(group.words);
    const overlap = selected.filter((w) => groupSet.has(w)).length;
    if (overlap === 3) {
      return { correct: false, isOneAway: true };
    }
  }

  return { correct: false };
}
