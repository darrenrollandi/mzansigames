/**
 * Epoch start for puzzle indexing -- January 1, 2024.
 */
const EPOCH = new Date(2024, 0, 1);

/**
 * Returns the number of days between the epoch and the given date,
 * ignoring time-of-day.
 */
function daysSinceEpoch(date: Date): number {
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcEpoch = Date.UTC(
    EPOCH.getFullYear(),
    EPOCH.getMonth(),
    EPOCH.getDate()
  );
  return Math.floor((utcDate - utcEpoch) / (1000 * 60 * 60 * 24));
}

/**
 * Simple seeded 32-bit PRNG (mulberry32).
 * Returns a function that produces a new pseudo-random float [0, 1) each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get a deterministic puzzle index for a given date.
 *
 * Same date always yields the same index.
 * Cycles through the full list via modular arithmetic so every puzzle
 * is used before any repeats.
 */
export function getPuzzleIndex(date: Date, listLength: number): number {
  if (listLength <= 0) return 0;
  const days = daysSinceEpoch(date);
  return ((days % listLength) + listLength) % listLength;
}

/**
 * Return a new array with elements shuffled deterministically based on `seed`.
 *
 * Uses Fisher-Yates shuffle powered by a seeded PRNG so the same seed
 * always produces the same ordering.
 */
export function seededShuffle<T>(array: readonly T[], seed: number): T[] {
  const result = [...array];
  const rng = mulberry32(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
