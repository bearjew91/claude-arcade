#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCK_FILE = path.join(os.homedir(), '.claude', 'arcade.lock');
const STATS_FILE = path.join(os.homedir(), '.claude', 'arcade-stats.json');
const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'words.json'), 'utf8'));
const trivia = require('./trivia');

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

// ── ANSI helpers ──

const ESC = '\x1b';
const R = `${ESC}[0m`;
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

function clearScreen() { return `${ESC}[2J${ESC}[H`; }

// ── Hangman Stats ──

function loadHangmanStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  } catch {
    return { played: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, categoryStats: {} };
  }
}
function saveHangmanStats(stats) {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// ── Hangman art ──

const HANGMAN = [
  [
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
  [
    `  ${GRAY}|---+${R}`,
    `  ${GRAY}|${R}   ${YELLOW}O${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
  [
    `  ${GRAY}|---+${R}`,
    `  ${GRAY}|${R}   ${YELLOW}O${R}`,
    `  ${GRAY}|${R}   ${WHITE}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
  [
    `  ${GRAY}|---+${R}`,
    `  ${GRAY}|${R}   ${YELLOW}O${R}`,
    `  ${GRAY}|${R}  ${WHITE}/|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
  [
    `  ${GRAY}|---+${R}`,
    `  ${GRAY}|${R}   ${YELLOW}O${R}`,
    `  ${GRAY}|${R}  ${WHITE}/|\\${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
  [
    `  ${GRAY}|---+${R}`,
    `  ${GRAY}|${R}   ${YELLOW}O${R}`,
    `  ${GRAY}|${R}  ${WHITE}/|\\${R}`,
    `  ${GRAY}|${R}  ${WHITE}/${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
  [
    `  ${GRAY}|---+${R}`,
    `  ${GRAY}|${R}   ${RED}O${R}`,
    `  ${GRAY}|${R}  ${RED}/|\\${R}`,
    `  ${GRAY}|${R}  ${RED}/ \\${R}`,
    `  ${GRAY}|${R}`,
    `  ${GRAY}|_______${R}`,
  ],
];

// ── Hangman word selection ──

function pickWord() {
  const categories = Object.keys(WORDS);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const wordList = WORDS[category];
  const word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
  return { word, category };
}

// ── Hangman game state ──

function newHangmanGame() {
  const { word, category } = pickWord();
  return {
    word, category,
    guessed: new Set(),
    wrong: [],
    maxWrong: 6,
    won: false, lost: false,
    message: '', messageColor: CYAN,
  };
}

// ── Hangman rendering ──

function renderHangmanWord(state) {
  return state.word.split('').map(ch => {
    if (state.guessed.has(ch)) return `${GREEN}${BOLD}${ch}${R}`;
    else if (state.won || state.lost) return `${RED}${BOLD}${ch}${R}`;
    else return `${DIM}_${R}`;
  }).join(' ');
}

function renderHangmanKeyboard(state) {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  return rows.map((row, i) => {
    const pad = i === 1 ? '  ' : i === 2 ? '    ' : '';
    const keys = row.split('').map(ch => {
      if (state.word.includes(ch) && state.guessed.has(ch)) return `${BG_GREEN} ${ch} ${R}`;
      else if (state.wrong.includes(ch)) return `${BG_RED} ${ch} ${R}`;
      else if (state.guessed.has(ch)) return `${GRAY} ${ch} ${R}`;
      else return `${WHITE} ${ch} ${R}`;
    }).join('');
    return `  ${pad}${keys}`;
  }).join('\n');
}

function renderHangmanProgressBar(state) {
  const remaining = state.maxWrong - state.wrong.length;
  const filled = '#'.repeat(remaining);
  const empty = '-'.repeat(state.wrong.length);
  const color = remaining <= 2 ? RED : remaining <= 4 ? YELLOW : GREEN;
  return `  ${color}[${filled}${GRAY}${empty}${color}]${R} ${DIM}${remaining}/${state.maxWrong} lives${R}`;
}

function renderHangman(state) {
  const out = [];
  out.push(clearScreen() + HIDE_CURSOR);

  out.push(`${CYAN}${BOLD}  +---------------------------------+${R}`);
  out.push(`${CYAN}${BOLD}  |       D E V   H A N G M A N     |${R}`);
  out.push(`${CYAN}${BOLD}  +---------------------------------+${R}`);
  out.push('');
  out.push(`  ${DIM}Category:${R} ${BG_YELLOW} ${state.category.toUpperCase()} ${R}`);
  out.push('');

  const stage = Math.min(state.wrong.length, HANGMAN.length - 1);
  for (const line of HANGMAN[stage]) out.push(line);
  out.push('');
  out.push(`  ${renderHangmanWord(state)}`);
  out.push('');
  out.push(renderHangmanProgressBar(state));
  out.push('');

  if (state.wrong.length > 0) {
    out.push(`  ${DIM}Wrong:${R} ${state.wrong.map(ch => `${RED}${ch}${R}`).join(' ')}`);
  } else {
    out.push(`  ${DIM}No wrong guesses yet${R}`);
  }
  out.push('');
  out.push(renderHangmanKeyboard(state));
  out.push('');

  if (state.message) out.push(`  ${state.messageColor}${BOLD}${state.message}${R}`);
  out.push('');

  if (state.won || state.lost) {
    out.push(`  ${CYAN}[N]${R} New Game  ${CYAN}[M]${R} Menu  ${CYAN}[Q]${R} Quit`);
  } else {
    out.push(`  ${DIM}Type a letter to guess | ESC quit${R}`);
  }
  process.stdout.write(out.join('\n') + '\n');
}

// ── Hangman input ──

function handleHangmanGuess(ch, state) {
  const letter = ch.toUpperCase();
  if (!/^[A-Z]$/.test(letter) || state.won || state.lost) return state;

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
      state.message = '>> YOU GOT IT! <<';
      state.messageColor = GREEN;
      recordHangmanResult(state, true);
    } else {
      const remaining = state.word.split('').filter(c => !state.guessed.has(c)).length;
      state.message = `+ Nice! ${remaining} letter${remaining === 1 ? '' : 's'} left`;
      state.messageColor = GREEN;
    }
  } else {
    state.wrong.push(letter);
    const lives = state.maxWrong - state.wrong.length;
    if (lives <= 0) {
      state.lost = true;
      state.message = `GAME OVER! The word was: ${state.word}`;
      state.messageColor = RED;
      recordHangmanResult(state, false);
    } else if (lives === 1) {
      state.message = 'x Last chance!';
      state.messageColor = RED;
    } else {
      state.message = `x Not in the word | ${lives} lives left`;
      state.messageColor = YELLOW;
    }
  }
  return state;
}

function recordHangmanResult(state, won) {
  const stats = loadHangmanStats();
  stats.played++;
  if (won) { stats.wins++; stats.streak++; stats.bestStreak = Math.max(stats.bestStreak, stats.streak); }
  else { stats.losses++; stats.streak = 0; }
  if (!stats.categoryStats) stats.categoryStats = {};
  if (!stats.categoryStats[state.category]) stats.categoryStats[state.category] = { played: 0, wins: 0 };
  stats.categoryStats[state.category].played++;
  if (won) stats.categoryStats[state.category].wins++;
  saveHangmanStats(stats);
}

// ── Main Menu ──

function renderMenu() {
  const out = [];
  out.push(clearScreen() + HIDE_CURSOR);
  out.push('');
  out.push(`${CYAN}${BOLD}  +=========================================+`);
  out.push(`  |                                         |`);
  out.push(`  |     C L A U D E   A R C A D E           |`);
  out.push(`  |     ${GRAY}${DIM}play while claude works${R}${CYAN}${BOLD}              |`);
  out.push(`  |                                         |`);
  out.push(`  +=========================================+${R}`);
  out.push('');
  out.push(`  ${GREEN}[1]${R}  Dev Hangman`);
  out.push(`      ${DIM}Guess tech terms letter by letter${R}`);
  out.push('');
  out.push(`  ${YELLOW}[2]${R}  Tech Trivia`);
  out.push(`      ${DIM}ABCD questions from easy to hard${R}`);
  out.push('');
  out.push(`  ${GRAY}[Q]  Quit${R}`);
  out.push('');
  out.push(`  ${DIM}Press 1 or 2 to start${R}`);

  process.stdout.write(out.join('\n') + '\n');
}

// ── Game loops ──

function runHangman(stdin, goMenu) {
  let state = newHangmanGame();
  renderHangman(state);

  const handler = (key) => {
    if (key === '\x03') { process.stdout.write(SHOW_CURSOR + clearScreen()); process.exit(0); }
    if (key === '\x1b') { stdin.removeListener('data', handler); goMenu(); return; }

    if (state.won || state.lost) {
      if (key === 'n' || key === 'N') { state = newHangmanGame(); renderHangman(state); }
      else if (key === 'm' || key === 'M') { stdin.removeListener('data', handler); goMenu(); }
      else if (key === 'q' || key === 'Q') { process.stdout.write(SHOW_CURSOR + clearScreen()); process.exit(0); }
      return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
      state = handleHangmanGuess(key, state);
      renderHangman(state);
    }
  };
  stdin.on('data', handler);
}

function runTrivia(stdin, goMenu) {
  let state = trivia.newGame();
  let showingStats = false;
  trivia.render(state);

  const handler = (key) => {
    if (key === '\x03') { process.stdout.write(SHOW_CURSOR + clearScreen()); process.exit(0); }
    if (key === '\x1b') { stdin.removeListener('data', handler); goMenu(); return; }

    if (showingStats) {
      showingStats = false;
      trivia.render(state);
      return;
    }

    if (state.gameOver) {
      if (key === 'n' || key === 'N') { state = trivia.newGame(); trivia.render(state); }
      else if (key === 's' || key === 'S') { showingStats = true; trivia.renderStats(); }
      else if (key === 'm' || key === 'M' || key === '\x1b') { stdin.removeListener('data', handler); goMenu(); }
      else if (key === 'q' || key === 'Q') { process.stdout.write(SHOW_CURSOR + clearScreen()); process.exit(0); }
      return;
    }

    if (state.revealed) {
      state = trivia.nextQuestion(state);
      trivia.render(state);
      return;
    }

    const lower = key.toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(lower)) {
      state = trivia.handleAnswer(lower, state);
      trivia.render(state);
    }
  };
  stdin.on('data', handler);
}

// ── Main ──

function main() {
  writeLock();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  function goMenu() {
    stdin.removeAllListeners('data');
    renderMenu();
    stdin.on('data', menuHandler);
  }

  function menuHandler(key) {
    if (key === '\x03' || key === '\x1b' || key === 'q' || key === 'Q') {
      process.stdout.write(SHOW_CURSOR + clearScreen());
      process.exit(0);
    }
    if (key === '1') { stdin.removeListener('data', menuHandler); runHangman(stdin, goMenu); }
    if (key === '2') { stdin.removeListener('data', menuHandler); runTrivia(stdin, goMenu); }
  }

  renderMenu();
  stdin.on('data', menuHandler);
}

main();
