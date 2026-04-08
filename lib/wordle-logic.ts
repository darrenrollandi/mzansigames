export type LetterResult = {
  letter: string;
  status: "correct" | "present" | "absent";
};

/**
 * Evaluate a guess against the answer.
 * Handles duplicate letters correctly:
 * - First pass: mark all correct (green) positions
 * - Second pass: mark present (yellow) only if the letter still has
 *   unmatched occurrences in the answer
 */
export function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const g = guess.toLowerCase().split("");
  const a = answer.toLowerCase().split("");
  const results: LetterResult[] = g.map((letter) => ({
    letter,
    status: "absent" as const,
  }));

  // Track which answer positions have been "used"
  const answerUsed = new Array(a.length).fill(false);

  // First pass: mark correct (exact match)
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      results[i].status = "correct";
      answerUsed[i] = true;
    }
  }

  // Second pass: mark present (letter exists but wrong position)
  for (let i = 0; i < g.length; i++) {
    if (results[i].status === "correct") continue;
    for (let j = 0; j < a.length; j++) {
      if (!answerUsed[j] && g[i] === a[j]) {
        results[i].status = "present";
        answerUsed[j] = true;
        break;
      }
    }
  }

  return results;
}

/**
 * Check if a guess is in the valid word list (case-insensitive).
 */
export function isValidGuess(guess: string, validWords: string[]): boolean {
  const lower = guess.toLowerCase();
  return validWords.some((w) => w.toLowerCase() === lower);
}

/**
 * Aggregate letter states across all guesses for keyboard coloring.
 * Priority: correct > present > absent
 */
export function getLetterStates(
  guesses: { guess: string; results: LetterResult[] }[]
): Record<string, "correct" | "present" | "absent"> {
  const states: Record<string, "correct" | "present" | "absent"> = {};

  for (const { results } of guesses) {
    for (const { letter, status } of results) {
      const l = letter.toLowerCase();
      const current = states[l];
      if (!current) {
        states[l] = status;
      } else if (current === "absent") {
        // Any non-absent status upgrades from absent
        if (status !== "absent") states[l] = status;
      } else if (current === "present") {
        // Only correct upgrades from present
        if (status === "correct") states[l] = status;
      }
      // If current is 'correct', nothing upgrades it
    }
  }

  return states;
}
