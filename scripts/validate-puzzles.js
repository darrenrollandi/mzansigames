#!/usr/bin/env node
/**
 * Validates the integrity of every puzzle data file.
 *
 *  - wordle-answers.json: every entry is a unique 5-letter string.
 *  - connections.json:    each puzzle has 4 groups of 4 distinct words,
 *                         16 unique words total, difficulties 1..4.
 *  - mini-clues.json:     5x5 grid, every across/down clue answer
 *                         matches the grid letters at its position.
 *  - strands-themes.json: spangram + theme words cover every cell
 *                         exactly once, each path is adjacent,
 *                         and grid letters match each word.
 *
 *  Exits non-zero on any failure so it can be wired into CI/pre-commit.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const errors = [];
const fail = (msg) => errors.push(msg);

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
}

// ---- Wordle ----
const wordleAnswers = loadJSON('wordle-answers.json');
const wordleValid = loadJSON('wordle-valid.json');
const seenWordle = new Set();
wordleAnswers.forEach((w, i) => {
  if (typeof w !== 'string' || w.length !== 5 || !/^[a-z]+$/i.test(w)) {
    fail(`wordle-answers[${i}] "${w}" is not a 5-letter word`);
  }
  const lower = w.toLowerCase();
  if (seenWordle.has(lower)) fail(`wordle-answers[${i}] duplicate "${w}"`);
  seenWordle.add(lower);
});
wordleValid.forEach((w, i) => {
  if (typeof w !== 'string' || w.length !== 5) {
    fail(`wordle-valid[${i}] "${w}" is not 5 letters`);
  }
});

// ---- Connections ----
const connections = loadJSON('connections.json');
connections.forEach((p, pi) => {
  if (!p.groups || p.groups.length !== 4) {
    return fail(`connections[${pi}] should have 4 groups`);
  }
  const allWords = [];
  const diffs = new Set();
  for (let gi = 0; gi < p.groups.length; gi++) {
    const g = p.groups[gi];
    if (!g.category) fail(`connections[${pi}].groups[${gi}] missing category`);
    if (g.difficulty < 1 || g.difficulty > 4) {
      fail(`connections[${pi}].groups[${gi}] difficulty ${g.difficulty} out of range`);
    }
    diffs.add(g.difficulty);
    if (!Array.isArray(g.words) || g.words.length !== 4) {
      fail(`connections[${pi}].groups[${gi}] should have 4 words`);
    } else {
      allWords.push(...g.words);
    }
  }
  if (diffs.size !== 4) fail(`connections[${pi}] missing difficulty levels`);
  if (new Set(allWords).size !== 16) {
    fail(`connections[${pi}] has duplicate words across groups`);
  }
});

// ---- Mini Crosswords ----
const mini = loadJSON('mini-clues.json');
mini.forEach((p, pi) => {
  if (!Array.isArray(p.grid) || p.grid.length !== 5) {
    return fail(`mini[${pi}] grid should be 5 rows`);
  }
  for (let r = 0; r < 5; r++) {
    if (p.grid[r].length !== 5) fail(`mini[${pi}].grid[${r}] should have 5 cells`);
  }
  const checkClue = (dir, c) => {
    if (typeof c.answer !== 'string' || c.length !== c.answer.length) {
      fail(`mini[${pi}] ${dir} ${c.number} length/answer mismatch`);
    }
    for (let i = 0; i < c.length; i++) {
      const r = dir === 'across' ? c.row : c.row + i;
      const col = dir === 'across' ? c.col + i : c.col;
      if (p.grid[r][col] !== c.answer[i]) {
        fail(
          `mini[${pi}] ${dir} ${c.number} "${c.answer}" letter ${i + 1} ` +
            `expects "${c.answer[i]}" but grid has "${p.grid[r][col]}"`
        );
      }
    }
  };
  (p.across || []).forEach((c) => checkClue('across', c));
  (p.down || []).forEach((c) => checkClue('down', c));
});

// ---- Strands ----
const strands = loadJSON('strands-themes.json');
strands.forEach((p, pi) => {
  if (!Array.isArray(p.grid) || p.grid.length === 0) {
    return fail(`strands[${pi}] grid is empty`);
  }
  const rows = p.grid.length;
  const cols = p.grid[0].length;
  for (const row of p.grid) {
    if (row.length !== cols) fail(`strands[${pi}] grid is not rectangular`);
  }
  const totalCells = rows * cols;

  const checkPath = (label, word, cells) => {
    if (cells.length !== word.length) {
      return fail(`strands[${pi}] ${label} "${word}" has ${cells.length} cells for ${word.length} letters`);
    }
    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      if (r < 0 || r >= rows || c < 0 || c >= cols) {
        fail(`strands[${pi}] ${label} cell out of bounds`);
        return;
      }
      if (p.grid[r][c] !== word[i]) {
        fail(`strands[${pi}] ${label} "${word}" letter ${i} expects "${word[i]}" but grid has "${p.grid[r][c]}"`);
      }
      if (i > 0) {
        const [pr, pc] = cells[i - 1];
        const dr = Math.abs(r - pr);
        const dc = Math.abs(c - pc);
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
          fail(`strands[${pi}] ${label} "${word}" non-adjacent step ${i - 1}→${i}`);
        }
      }
    }
  };
  const cellSet = new Set();
  const recordCells = (cells) => {
    for (const [r, c] of cells) {
      const k = `${r},${c}`;
      if (cellSet.has(k)) fail(`strands[${pi}] cell (${r},${c}) used by multiple words`);
      cellSet.add(k);
    }
  };
  checkPath('spangram', p.spangram.word, p.spangram.cells);
  recordCells(p.spangram.cells);
  for (const tw of p.themeWords) {
    checkPath('theme word', tw.word, tw.cells);
    recordCells(tw.cells);
  }
  if (cellSet.size !== totalCells) {
    fail(`strands[${pi}] covers ${cellSet.size}/${totalCells} cells`);
  }
  const sr = p.spangram.cells.map(([r]) => r);
  const sc = p.spangram.cells.map(([, c]) => c);
  const spans =
    (sr.includes(0) && sr.includes(rows - 1)) || (sc.includes(0) && sc.includes(cols - 1));
  if (!spans) fail(`strands[${pi}] spangram does not span opposite edges`);
});

if (errors.length) {
  console.error(`\n❌ ${errors.length} validation errors:`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
} else {
  console.log(
    `✅ Puzzle data valid: ${wordleAnswers.length} wordle, ${connections.length} connections, ${mini.length} mini, ${strands.length} strands`
  );
}
