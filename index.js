#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCK_FILE = path.join(os.homedir(), '.claude', 'arcade.lock');
const STATS_FILE = path.join(os.homedir(), '.claude', 'arcade-stats.json');
const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'words.json'), 'utf8'));

// ── Lock management ──

function writeLock() {
  const dir = path.dirname(LOCK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}
function removeLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
}
process.on('exit', removeLock);
process.on('SIGINT', () => { removeLock(); process.exit(0); });
process.on('SIGTERM', () => { removeLock(); process.exit(0); });

// ── Stats ──

function loadStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  } catch {
    return { played: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, categoryStats: {} };
  }
}
function saveStats(stats) {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// ── ANSI helpers ──

const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const MAGENTA = `${ESC}[35m`;
const WHITE = `${ESC}[37m`;
const GRAY = `${ESC}[90m`;
const BG_GREEN = `${ESC}[42m${ESC}[30m`;
const BG_RED = `${ESC}[41m${ESC}[37m`;
const BG_YELLOW = `${ESC}[43m${ESC}[30m`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

function moveTo(row, col) { return `${ESC}[${row};${col}H`; }
function clearScreen() { return `${ESC}[2J${ESC}[H`; }

// ── Hangman art (8 stages: 0 = empty, 7 = dead) ──

const HANGMAN = [
  // 0 - empty gallows
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
  // 1 - head
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │      ${YELLOW}O${RESET}  `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
  // 2 - body
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │      ${YELLOW}O${RESET}  `,
    `  │      ${WHITE}│${RESET}  `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
  // 3 - left arm
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │      ${YELLOW}O${RESET}  `,
    `  │     ${WHITE}╱│${RESET}  `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
  // 4 - right arm
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │      ${YELLOW}O${RESET}  `,
    `  │     ${WHITE}╱│╲${RESET} `,
    `  │         `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
  // 5 - left leg
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │      ${YELLOW}O${RESET}  `,
    `  │     ${WHITE}╱│╲${RESET} `,
    `  │     ${WHITE}╱${RESET}   `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
  // 6 - right leg
  [
    `  ┌───────┐ `,
    `  │       │ `,
    `  │      ${RED}O${RESET}  `,
    `  │     ${RED}╱│╲${RESET} `,
    `  │     ${RED}╱ ╲${RESET} `,
    `  │         `,
    `  │         `,
    `  ╧═════════`,
  ],
];

// ── Word selection ──

function pickWord() {
  const categories = Object.keys(WORDS);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const wordList = WORDS[category];
  const word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
  return { word, category };
}

// ── Game state ──

function newGame() {
  const { word, category } = pickWord();
  return {
    word,
    category,
    guessed: new Set(),
    wrong: [],
    maxWrong: 6,
    won: false,
    lost: false,
    message: '',
    messageColor: CYAN,
  };
}

// ── Rendering ──

function renderWord(state) {
  return state.word
    .split('')
    .map(ch => {
      if (state.guessed.has(ch)) {
        return `${GREEN}${BOLD}${ch}${RESET}`;
      } else if (state.won || state.lost) {
        return `${RED}${BOLD}${ch}${RESET}`;
      } else {
        return `${DIM}_${RESET}`;
      }
    })
    .join(' ');
}

function renderKeyboard(state) {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  return rows.map((row, i) => {
    const pad = i === 1 ? '  ' : i === 2 ? '    ' : '';
    const keys = row.split('').map(ch => {
      if (state.word.includes(ch) && state.guessed.has(ch)) {
        return `${BG_GREEN} ${ch} ${RESET}`;
      } else if (state.wrong.includes(ch)) {
        return `${BG_RED} ${ch} ${RESET}`;
      } else if (state.guessed.has(ch)) {
        return `${GRAY} ${ch} ${RESET}`;
      } else {
        return `${WHITE} ${ch} ${RESET}`;
      }
    }).join('');
    return `  ${pad}${keys}`;
  }).join('\n');
}

function renderProgressBar(state) {
  const total = state.maxWrong;
  const used = state.wrong.length;
  const remaining = total - used;
  const filled = '█'.repeat(remaining);
  const empty = '░'.repeat(used);
  const color = remaining <= 2 ? RED : remaining <= 4 ? YELLOW : GREEN;
  return `  ${color}${filled}${GRAY}${empty}${RESET} ${DIM}${remaining}/${total} lives${RESET}`;
}

function render(state) {
  const out = [];

  out.push(clearScreen() + HIDE_CURSOR);

  // Title
  out.push(`${CYAN}${BOLD}`);
  out.push(`  ╔══════════════════════════════════╗`);
  out.push(`  ║     ${MAGENTA}⌨${CYAN}  DEV HANGMAN  ${MAGENTA}⌨${CYAN}           ║`);
  out.push(`  ╚══════════════════════════════════╝${RESET}`);
  out.push('');

  // Category hint
  const catLabel = state.category.toUpperCase();
  out.push(`  ${DIM}Category:${RESET} ${BG_YELLOW} ${catLabel} ${RESET}`);
  out.push('');

  // Hangman art
  const stage = Math.min(state.wrong.length, HANGMAN.length - 1);
  for (const line of HANGMAN[stage]) {
    out.push(line);
  }
  out.push('');

  // Word display
  out.push(`  ${renderWord(state)}`);
  out.push('');

  // Progress bar
  out.push(renderProgressBar(state));
  out.push('');

  // Wrong letters
  if (state.wrong.length > 0) {
    const wrongStr = state.wrong.map(ch => `${RED}${ch}${RESET}`).join(' ');
    out.push(`  ${DIM}Wrong:${RESET} ${wrongStr}`);
  } else {
    out.push(`  ${DIM}No wrong guesses yet${RESET}`);
  }
  out.push('');

  // Keyboard
  out.push(renderKeyboard(state));
  out.push('');

  // Message
  if (state.message) {
    out.push(`  ${state.messageColor}${BOLD}${state.message}${RESET}`);
    out.push('');
  }

  // Controls
  if (state.won || state.lost) {
    out.push(`  ${CYAN}[N]${RESET} New Game  ${CYAN}[S]${RESET} Stats  ${CYAN}[Q]${RESET} Quit`);
  } else {
    out.push(`  ${DIM}Type a letter to guess · ESC to quit${RESET}`);
  }

  process.stdout.write(out.join('\n') + '\n');
}

// ── Stats display ──

function renderStats() {
  const s = loadStats();
  const winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
  const out = [];

  out.push(clearScreen());
  out.push(`${CYAN}${BOLD}`);
  out.push(`  ╔══════════════════════════════════╗`);
  out.push(`  ║        📊  HANGMAN STATS          ║`);
  out.push(`  ╚══════════════════════════════════╝${RESET}`);
  out.push('');
  out.push(`  ${WHITE}Games Played:  ${BOLD}${s.played}${RESET}`);
  out.push(`  ${GREEN}Wins:          ${BOLD}${s.wins}${RESET}`);
  out.push(`  ${RED}Losses:        ${BOLD}${s.losses}${RESET}`);
  out.push(`  ${YELLOW}Win Rate:      ${BOLD}${winRate}%${RESET}`);
  out.push(`  ${CYAN}Streak:        ${BOLD}${s.streak}${RESET}`);
  out.push(`  ${MAGENTA}Best Streak:   ${BOLD}${s.bestStreak}${RESET}`);
  out.push('');

  const cats = Object.entries(s.categoryStats || {});
  if (cats.length > 0) {
    out.push(`  ${DIM}─── By Category ───${RESET}`);
    for (const [cat, data] of cats) {
      const catRate = data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0;
      out.push(`  ${BG_YELLOW} ${cat.toUpperCase()} ${RESET} ${data.wins}/${data.played} (${catRate}%)`);
    }
    out.push('');
  }

  out.push(`  ${DIM}Press any key to return...${RESET}`);

  process.stdout.write(out.join('\n') + '\n');
}

// ── Input handling ──

function handleGuess(ch, state) {
  const letter = ch.toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return state;
  if (state.won || state.lost) return state;

  if (state.guessed.has(letter)) {
    state.message = `Already guessed '${letter}'`;
    state.messageColor = YELLOW;
    return state;
  }

  state.guessed.add(letter);

  if (state.word.includes(letter)) {
    const allRevealed = state.word.split('').every(c => state.guessed.has(c));
    if (allRevealed) {
      state.won = true;
      state.message = '🎉 You got it!';
      state.messageColor = GREEN;
      recordResult(state, true);
    } else {
      const remaining = state.word.split('').filter(c => !state.guessed.has(c)).length;
      state.message = `✓ Nice! ${remaining} letter${remaining === 1 ? '' : 's'} left`;
      state.messageColor = GREEN;
    }
  } else {
    state.wrong.push(letter);
    const lives = state.maxWrong - state.wrong.length;
    if (lives <= 0) {
      state.lost = true;
      state.message = `💀 The word was: ${state.word}`;
      state.messageColor = RED;
      recordResult(state, false);
    } else if (lives === 1) {
      state.message = `✗ Last chance!`;
      state.messageColor = RED;
    } else {
      state.message = `✗ Not in the word · ${lives} lives left`;
      state.messageColor = YELLOW;
    }
  }

  return state;
}

function recordResult(state, won) {
  const stats = loadStats();
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.losses++;
    stats.streak = 0;
  }
  if (!stats.categoryStats) stats.categoryStats = {};
  if (!stats.categoryStats[state.category]) {
    stats.categoryStats[state.category] = { played: 0, wins: 0 };
  }
  stats.categoryStats[state.category].played++;
  if (won) stats.categoryStats[state.category].wins++;
  saveStats(stats);
}

// ── Main loop ──

function main() {
  writeLock();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let state = newGame();
  let showingStats = false;

  render(state);

  stdin.on('data', (key) => {
    // Ctrl+C
    if (key === '\x03') {
      process.stdout.write(SHOW_CURSOR + clearScreen());
      process.exit(0);
    }

    // Stats screen — any key returns
    if (showingStats) {
      showingStats = false;
      render(state);
      return;
    }

    // ESC / Q to quit
    if (key === '\x1b' || key === 'q' || key === 'Q') {
      if (state.won || state.lost) {
        process.stdout.write(SHOW_CURSOR + clearScreen());
        process.exit(0);
      }
      if (key === '\x1b') {
        process.stdout.write(SHOW_CURSOR + clearScreen());
        process.exit(0);
      }
    }

    // Game over controls
    if (state.won || state.lost) {
      if (key === 'n' || key === 'N') {
        state = newGame();
        render(state);
      } else if (key === 's' || key === 'S') {
        showingStats = true;
        renderStats();
      } else if (key === 'q' || key === 'Q') {
        process.stdout.write(SHOW_CURSOR + clearScreen());
        process.exit(0);
      }
      return;
    }

    // Letter guess
    if (/^[a-zA-Z]$/.test(key)) {
      state = handleGuess(key, state);
      render(state);
    }
  });
}

main();
