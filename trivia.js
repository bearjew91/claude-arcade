const fs = require('fs');
const path = require('path');
const os = require('os');

const STATS_FILE = path.join(os.homedir(), '.claude', 'arcade-trivia-stats.json');
const TRIVIA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'trivia.json'), 'utf8'));

// ── ANSI ──

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
const BG_CYAN = `${ESC}[46m${ESC}[30m`;
const BG_GREEN = `${ESC}[42m${ESC}[30m`;
const BG_RED = `${ESC}[41m${ESC}[37m`;
const BG_YELLOW = `${ESC}[43m${ESC}[30m`;
const BG_MAGENTA = `${ESC}[45m${ESC}[37m`;
const BG_GRAY = `${ESC}[100m${ESC}[37m`;
const HIDE = `${ESC}[?25l`;
const CLR = `${ESC}[2J${ESC}[H`;

// ── Stats ──

function loadStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  } catch {
    return { played: 0, correct: 0, streak: 0, bestStreak: 0, byDifficulty: {}, byCategory: {} };
  }
}

function saveStats(stats) {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// ── Game state ──

function buildQuestionPool() {
  const pool = [];
  for (const [diff, questions] of Object.entries(TRIVIA)) {
    for (const q of questions) {
      pool.push({ ...q, difficulty: diff });
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function newGame() {
  const pool = buildQuestionPool();
  return {
    pool, index: 0, score: 0, streak: 0, bestStreak: 0,
    correct: 0, total: 0, selected: null, revealed: false,
    gameOver: false, message: '', messageColor: '',
  };
}

// ── Rendering helpers ──

function difficultyBadge(diff) {
  if (diff === 'easy') return `${BG_GREEN} EASY ${R}`;
  if (diff === 'medium') return `${BG_YELLOW} MEDIUM ${R}`;
  if (diff === 'hard') return `${BG_RED} HARD ${R}`;
  return diff;
}

function categoryBadge(cat) {
  if (cat === 'cyber') return `${BG_MAGENTA} CYBER ${R}`;
  if (cat === 'dev') return `${BG_CYAN} DEV ${R}`;
  if (cat === 'web') return `${BG_GREEN} WEB ${R}`;
  if (cat === 'tech') return `${BG_GRAY} TECH ${R}`;
  return cat;
}

function renderOption(label, text, state, question) {
  const letter = label.toLowerCase();
  const isSelected = state.selected === letter;
  const isCorrect = question.answer === letter;

  if (state.revealed) {
    if (isCorrect) {
      return `  ${BG_GREEN} ${label} ${R} ${GREEN}${BOLD}${text}${R}  ${GREEN}<--${R}`;
    } else if (isSelected && !isCorrect) {
      return `  ${BG_RED} ${label} ${R} ${RED}${DIM}${text}${R}  ${RED}x${R}`;
    } else {
      return `  ${GRAY} ${label}  ${text}${R}`;
    }
  } else {
    return `  ${BG_CYAN} ${label} ${R} ${WHITE}${text}${R}`;
  }
}

function wordWrap(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Main render ──

function render(state) {
  if (state.gameOver) {
    renderGameOver(state);
    return;
  }

  const q = state.pool[state.index];
  const out = [];

  out.push(CLR + HIDE);

  // Header
  out.push(`${CYAN}${BOLD}  +=========================================+`);
  out.push(`  |       T E C H   T R I V I A             |`);
  out.push(`  +=========================================+${R}`);
  out.push('');

  // Score line
  const bar = '#'.repeat(Math.min(state.score, 20)) + '-'.repeat(Math.max(0, 20 - state.score));
  const barColor = state.score >= 40 ? GREEN : state.score >= 20 ? YELLOW : WHITE;
  out.push(`  ${YELLOW}Score:${R} ${barColor}[${bar}]${R} ${BOLD}${state.score}${R}  ${GREEN}Streak: ${BOLD}${state.streak}${R}  ${GRAY}Q: ${state.index + 1}/${state.pool.length}${R}`);
  out.push('');

  // Badges
  out.push(`  ${difficultyBadge(q.difficulty)}  ${categoryBadge(q.category)}`);
  out.push('');

  // Question box
  out.push(`  ${CYAN}+------------------------------------------+${R}`);
  const qLines = wordWrap(q.q, 38);
  for (const line of qLines) {
    const pad = ' '.repeat(Math.max(0, 40 - line.length));
    out.push(`  ${CYAN}|${R} ${WHITE}${BOLD}${line}${R}${pad}${CYAN}|${R}`);
  }
  out.push(`  ${CYAN}+------------------------------------------+${R}`);
  out.push('');

  // Options
  out.push(renderOption('A', q.a, state, q));
  out.push(renderOption('B', q.b, state, q));
  out.push(renderOption('C', q.c, state, q));
  out.push(renderOption('D', q.d, state, q));
  out.push('');

  // Separator
  out.push(`  ${GRAY}------------------------------------------${R}`);

  // Message or prompt
  if (state.message) {
    out.push(`  ${state.messageColor}${BOLD}${state.message}${R}`);
  } else if (state.revealed) {
    out.push(`  ${DIM}Press any key for next question...${R}`);
  } else {
    out.push(`  ${DIM}Press A, B, C, or D to answer | ESC quit${R}`);
  }
  out.push('');

  // Points info
  if (!state.revealed) {
    const pts = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3;
    const streakBonus = state.streak >= 3 ? ` ${YELLOW}+${Math.floor(state.streak / 3)} streak bonus${R}` : '';
    out.push(`  ${GRAY}Worth: ${pts} pts${streakBonus}${R}`);
  }

  process.stdout.write(out.join('\n') + '\n');
}

function renderGameOver(state) {
  const accuracy = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  const out = [];

  out.push(CLR + HIDE);
  out.push('');

  out.push(`${CYAN}${BOLD}  +=========================================+`);
  out.push(`  |                                         |`);
  out.push(`  |        G A M E   O V E R                |`);
  out.push(`  |                                         |`);
  out.push(`  +=========================================+${R}`);
  out.push('');

  out.push(`  ${WHITE}Final Score:  ${YELLOW}${BOLD}${state.score}${R}`);
  out.push(`  ${WHITE}Correct:      ${GREEN}${state.correct}${R} / ${state.total}`);
  out.push(`  ${WHITE}Accuracy:     ${accuracy >= 70 ? GREEN : accuracy >= 40 ? YELLOW : RED}${accuracy}%${R}`);
  out.push(`  ${WHITE}Best Streak:  ${MAGENTA}${state.bestStreak}${R}`);
  out.push('');

  let rating;
  if (accuracy >= 90) rating = `${GREEN}${BOLD}** ELITE HACKER **${R}`;
  else if (accuracy >= 70) rating = `${CYAN}${BOLD}>> SENIOR DEV <<${R}`;
  else if (accuracy >= 50) rating = `${YELLOW}${BOLD}-- JUNIOR DEV --${R}`;
  else rating = `${RED}${BOLD}.. SCRIPT KIDDIE ..${R}`;

  out.push(`  ${DIM}Rating:${R} ${rating}`);
  out.push('');
  out.push(`  ${CYAN}[N]${R} New Game  ${CYAN}[S]${R} Stats  ${CYAN}[M]${R} Menu  ${CYAN}[Q]${R} Quit`);

  process.stdout.write(out.join('\n') + '\n');
}

function renderStats() {
  const s = loadStats();
  const accuracy = s.played > 0 ? Math.round((s.correct / s.played) * 100) : 0;
  const out = [];

  out.push(CLR);

  out.push(`${CYAN}${BOLD}  +=========================================+`);
  out.push(`  |         T R I V I A   S T A T S          |`);
  out.push(`  +=========================================+${R}`);
  out.push('');
  out.push(`  ${WHITE}Questions Answered:  ${BOLD}${s.played}${R}`);
  out.push(`  ${GREEN}Correct:            ${BOLD}${s.correct}${R}`);
  out.push(`  ${YELLOW}Accuracy:           ${BOLD}${accuracy}%${R}`);
  out.push(`  ${CYAN}Best Streak:        ${BOLD}${s.bestStreak}${R}`);
  out.push('');

  const diffs = s.byDifficulty || {};
  if (Object.keys(diffs).length > 0) {
    out.push(`  ${DIM}--- By Difficulty ---${R}`);
    for (const [diff, data] of Object.entries(diffs)) {
      const rate = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      out.push(`  ${difficultyBadge(diff)} ${data.correct}/${data.total} (${rate}%)`);
    }
    out.push('');
  }

  const cats = s.byCategory || {};
  if (Object.keys(cats).length > 0) {
    out.push(`  ${DIM}--- By Category ---${R}`);
    for (const [cat, data] of Object.entries(cats)) {
      const rate = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      out.push(`  ${categoryBadge(cat)} ${data.correct}/${data.total} (${rate}%)`);
    }
    out.push('');
  }

  out.push(`  ${DIM}Press any key to return...${R}`);

  process.stdout.write(out.join('\n') + '\n');
}

// ── Input ──

function handleAnswer(key, state) {
  const q = state.pool[state.index];
  state.selected = key;
  state.revealed = true;

  const isCorrect = key === q.answer;
  const pts = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3;
  const streakBonus = state.streak >= 3 ? Math.floor(state.streak / 3) : 0;

  state.total++;

  if (isCorrect) {
    state.correct++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.score += pts + streakBonus;
    const msgs = [
      `${GREEN}+ CORRECT! +${pts + streakBonus} pts${R}`,
      `${GREEN}+ NAILED IT! +${pts + streakBonus} pts${R}`,
      `${GREEN}+ NICE ONE! +${pts + streakBonus} pts${R}`,
      `${GREEN}+ RIGHT! +${pts + streakBonus} pts${R}`,
    ];
    state.message = msgs[Math.floor(Math.random() * msgs.length)];
    state.messageColor = GREEN;
  } else {
    state.streak = 0;
    const msgs = [
      `x Nope! Answer was ${BOLD}${q.answer.toUpperCase()}${R}`,
      `x Wrong! It was ${BOLD}${q.answer.toUpperCase()}${R}`,
      `x Not quite! Answer: ${BOLD}${q.answer.toUpperCase()}${R}`,
    ];
    state.message = msgs[Math.floor(Math.random() * msgs.length)];
    state.messageColor = RED;
  }

  // Record stats
  const stats = loadStats();
  stats.played++;
  if (isCorrect) stats.correct++;
  stats.bestStreak = Math.max(stats.bestStreak, state.bestStreak);

  if (!stats.byDifficulty) stats.byDifficulty = {};
  if (!stats.byDifficulty[q.difficulty]) stats.byDifficulty[q.difficulty] = { total: 0, correct: 0 };
  stats.byDifficulty[q.difficulty].total++;
  if (isCorrect) stats.byDifficulty[q.difficulty].correct++;

  if (!stats.byCategory) stats.byCategory = {};
  if (!stats.byCategory[q.category]) stats.byCategory[q.category] = { total: 0, correct: 0 };
  stats.byCategory[q.category].total++;
  if (isCorrect) stats.byCategory[q.category].correct++;

  saveStats(stats);
  return state;
}

function nextQuestion(state) {
  state.index++;
  state.selected = null;
  state.revealed = false;
  state.message = '';

  if (state.index >= state.pool.length) {
    state.gameOver = true;
  }
  return state;
}

module.exports = { newGame, render, renderStats, handleAnswer, nextQuestion };
