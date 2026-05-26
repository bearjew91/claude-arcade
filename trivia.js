const fs = require('fs');
const path = require('path');
const os = require('os');

const STATS_FILE = path.join(os.homedir(), '.claude', 'arcade-trivia-stats.json');
const TRIVIA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'trivia.json'), 'utf8'));

// ── ANSI ──

const E = '\x1b';
const R = `${E}[0m`;
const B = `${E}[1m`;
const D = `${E}[2m`;
const ITAL = `${E}[3m`;
const UL = `${E}[4m`;
const GRN = `${E}[32m`;
const RED = `${E}[31m`;
const YEL = `${E}[33m`;
const CYN = `${E}[36m`;
const MAG = `${E}[35m`;
const WHT = `${E}[37m`;
const GRY = `${E}[90m`;
const BGRN = `${E}[42m${E}[30m`;
const BRED = `${E}[41m${E}[37m`;
const BYEL = `${E}[43m${E}[30m`;
const BMAG = `${E}[45m${E}[37m`;
const BCYN = `${E}[46m${E}[30m`;
const BGRY = `${E}[100m${E}[37m`;
const HIDE = `${E}[?25l`;
const CLR = `${E}[2J${E}[H`;

// ── Stats ──

function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
  catch { return { played: 0, correct: 0, streak: 0, bestStreak: 0, byDifficulty: {}, byCategory: {} }; }
}
function saveStats(stats) {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// ── Game state ──

function getTimeLimit(diff) {
  return diff === 'easy' ? 15 : diff === 'medium' ? 20 : 25;
}

function buildPool() {
  const pool = [];
  for (const [diff, qs] of Object.entries(TRIVIA))
    for (const q of qs) pool.push({ ...q, difficulty: diff });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function newGame() {
  const pool = buildPool();
  const tl = getTimeLimit(pool[0].difficulty);
  return {
    pool, index: 0, score: 0, streak: 0, bestStreak: 0,
    correct: 0, total: 0, selected: null, revealed: false,
    gameOver: false, message: '', messageColor: '',
    timeLeft: tl, timeMax: tl,
  };
}

// ── Helpers ──

function wrap(text, w) {
  const words = text.split(' ');
  const lines = []; let cur = '';
  for (const word of words) {
    if (cur.length + word.length + 1 > w && cur) { lines.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

function diffTag(d) {
  return d === 'easy' ? `${BGRN} EASY ${R}` : d === 'medium' ? `${BYEL} MED ${R}` : `${BRED} HARD ${R}`;
}

function catTag(c) {
  return c === 'cyber' ? `${BMAG} CYBER ${R}` : c === 'dev' ? `${BCYN} DEV ${R}` :
    c === 'web' ? `${BGRN} WEB ${R}` : `${BGRY} TECH ${R}`;
}

// ── Render ──

function render(state) {
  if (state.gameOver) { renderGameOver(state); return; }

  const q = state.pool[state.index];
  const o = [];
  const W = 44;

  o.push(CLR + HIDE);

  // ── Header block ──
  o.push(`${CYN}${B}  .---------------------------------------.${R}`);
  o.push(`${CYN}${B}  |  ${MAG}>>>${R}${CYN}${B} T E C H  T R I V I A ${MAG}<<<${CYN}${B}        |${R}`);
  o.push(`${CYN}${B}  '---------------------------------------'${R}`);

  // ── Score / Streak / Progress — single compact line ──
  const pct = Math.round(((state.index) / state.pool.length) * 100);
  o.push(`  ${YEL}${B}${state.score}${R}${GRY}pts${R}  ${GRN}x${state.streak}${R}${GRY}streak${R}  ${GRY}[${state.index + 1}/${state.pool.length}]${R}  ${D}${pct}%${R}`);

  // ── Timer ──
  const tp = state.timeLeft / state.timeMax;
  const tLen = 20;
  const tFill = Math.ceil(tp * tLen);
  const tClr = tp <= 0.25 ? RED : tp <= 0.5 ? YEL : GRN;
  const tBar = `${'='.repeat(tFill)}${GRY}${'.'.repeat(tLen - tFill)}${R}`;
  o.push(`  ${tClr}${B}${state.timeLeft}s${R} ${tClr}[${R}${tBar}${tClr}]${R}`);
  o.push('');

  // ── Tags ──
  o.push(`  ${diffTag(q.difficulty)} ${catTag(q.category)}`);
  o.push('');

  // ── Question ──
  const qLines = wrap(q.q, W - 6);
  o.push(`  ${CYN}+${'-'.repeat(W - 2)}+${R}`);
  for (const line of qLines) {
    const pad = ' '.repeat(Math.max(0, W - 4 - line.length));
    o.push(`  ${CYN}|${R} ${WHT}${B}${line}${R}${pad} ${CYN}|${R}`);
  }
  o.push(`  ${CYN}+${'-'.repeat(W - 2)}+${R}`);
  o.push('');

  // ── Options ──
  const opts = [['A', q.a], ['B', q.b], ['C', q.c], ['D', q.d]];
  for (const [label, text] of opts) {
    const key = label.toLowerCase();
    const isRight = q.answer === key;
    const isPicked = state.selected === key;

    if (state.revealed) {
      if (isRight) {
        o.push(`  ${BGRN} ${label} ${R} ${GRN}${B}${text}${R} ${GRN}<< correct${R}`);
      } else if (isPicked && !isRight) {
        o.push(`  ${BRED} ${label} ${R} ${RED}${D}${text}${R}`);
      } else {
        o.push(`  ${GRY} ${label}  ${D}${text}${R}`);
      }
    } else {
      o.push(`  ${BCYN} ${label} ${R} ${WHT}${text}${R}`);
    }
  }
  o.push('');

  // ── Footer ──
  o.push(`  ${GRY}${'~'.repeat(W - 2)}${R}`);
  if (state.message) {
    o.push(`  ${state.messageColor}${B}${state.message}${R}`);
  } else if (state.revealed) {
    o.push(`  ${D}any key -> next question${R}`);
  } else {
    const pts = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3;
    const bonus = state.streak >= 3 ? `${YEL} +${Math.floor(state.streak / 3)} combo${R}` : '';
    o.push(`  ${D}[A/B/C/D] answer | [ESC] quit${R}  ${GRY}${pts}pts${R}${bonus}`);
  }

  process.stdout.write(o.join('\n') + '\n');
}

function renderGameOver(state) {
  const acc = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  const o = [];
  o.push(CLR + HIDE);
  o.push('');

  // ── Big result ──
  o.push(`${CYN}${B}  .---------------------------------------.${R}`);
  o.push(`${CYN}${B}  |                                       |${R}`);

  let rank, rankClr;
  if (acc >= 90) { rank = '>>> ELITE HACKER <<<'; rankClr = GRN; }
  else if (acc >= 70) { rank = '>>  SENIOR DEV  <<'; rankClr = CYN; }
  else if (acc >= 50) { rank = '>  JUNIOR DEV  <'; rankClr = YEL; }
  else { rank = '  SCRIPT KIDDIE  '; rankClr = RED; }

  const rkPad = Math.floor((37 - rank.length) / 2);
  o.push(`${CYN}${B}  |${R}${' '.repeat(rkPad)}${rankClr}${B}${rank}${R}${' '.repeat(37 - rank.length - rkPad)}${CYN}${B}|${R}`);
  o.push(`${CYN}${B}  |                                       |${R}`);
  o.push(`${CYN}${B}  '---------------------------------------'${R}`);
  o.push('');

  // ── Stats block ──
  const accClr = acc >= 70 ? GRN : acc >= 40 ? YEL : RED;
  o.push(`  ${YEL}${B}SCORE${R}  ${B}${state.score}${R}`);
  o.push(`  ${GRN}RIGHT${R}  ${state.correct} / ${state.total}  ${accClr}(${acc}%)${R}`);
  o.push(`  ${MAG}COMBO${R}  best x${state.bestStreak}`);
  o.push('');

  // ── Score bar visual ──
  const barMax = 30;
  const barFill = Math.min(state.score, barMax);
  o.push(`  ${GRY}[${R}${YEL}${'#'.repeat(barFill)}${GRY}${'.'.repeat(barMax - barFill)}${R}${GRY}]${R}`);
  o.push('');

  o.push(`  ${CYN}[N]${R} again  ${CYN}[S]${R} stats  ${CYN}[M]${R} menu  ${CYN}[Q]${R} quit`);
  process.stdout.write(o.join('\n') + '\n');
}

function renderStats() {
  const s = loadStats();
  const acc = s.played > 0 ? Math.round((s.correct / s.played) * 100) : 0;
  const o = [];
  o.push(CLR);

  o.push(`${CYN}${B}  .---------------------------------------.${R}`);
  o.push(`${CYN}${B}  |  ${MAG}>>>${R}${CYN}${B} TRIVIA STATS ${MAG}<<<${CYN}${B}               |${R}`);
  o.push(`${CYN}${B}  '---------------------------------------'${R}`);
  o.push('');
  o.push(`  ${WHT}Answered  ${B}${s.played}${R}   ${GRN}Correct  ${B}${s.correct}${R}   ${accClrFn(acc)}Acc  ${B}${acc}%${R}   ${MAG}Best  ${B}x${s.bestStreak}${R}`);
  o.push('');

  const diffs = s.byDifficulty || {};
  if (Object.keys(diffs).length > 0) {
    o.push(`  ${D}--- difficulty ---${R}`);
    for (const [d, data] of Object.entries(diffs)) {
      const r = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      o.push(`  ${diffTag(d)} ${data.correct}/${data.total} (${r}%)`);
    }
    o.push('');
  }
  const cats = s.byCategory || {};
  if (Object.keys(cats).length > 0) {
    o.push(`  ${D}--- category ---${R}`);
    for (const [c, data] of Object.entries(cats)) {
      const r = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      o.push(`  ${catTag(c)} ${data.correct}/${data.total} (${r}%)`);
    }
    o.push('');
  }
  o.push(`  ${D}any key to return${R}`);
  process.stdout.write(o.join('\n') + '\n');
}

function accClrFn(a) { return a >= 70 ? GRN : a >= 40 ? YEL : RED; }

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
    const earned = pts + streakBonus;
    state.score += earned;
    const fast = state.timeLeft > state.timeMax * 0.7;
    const msgs = fast
      ? [`${GRN}LIGHTNING! +${earned}${R}`, `${GRN}SPEED DEMON! +${earned}${R}`, `${GRN}BLAZING! +${earned}${R}`]
      : [`${GRN}CORRECT +${earned}${R}`, `${GRN}NICE! +${earned}${R}`, `${GRN}RIGHT! +${earned}${R}`];
    state.message = msgs[Math.floor(Math.random() * msgs.length)];
    state.messageColor = GRN;
  } else {
    state.streak = 0;
    state.message = `${RED}WRONG${R} ${GRY}answer: ${B}${q.answer.toUpperCase()}${R}`;
    state.messageColor = RED;
  }

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

function handleTimeout(state) {
  const q = state.pool[state.index];
  state.revealed = true;
  state.selected = null;
  state.total++;
  state.streak = 0;
  state.message = `${RED}TIME'S UP!${R} ${GRY}answer: ${B}${q.answer.toUpperCase()}${R}`;
  state.messageColor = RED;

  const stats = loadStats();
  stats.played++;
  if (!stats.byDifficulty) stats.byDifficulty = {};
  if (!stats.byDifficulty[q.difficulty]) stats.byDifficulty[q.difficulty] = { total: 0, correct: 0 };
  stats.byDifficulty[q.difficulty].total++;
  if (!stats.byCategory) stats.byCategory = {};
  if (!stats.byCategory[q.category]) stats.byCategory[q.category] = { total: 0, correct: 0 };
  stats.byCategory[q.category].total++;
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
  } else {
    const tl = getTimeLimit(state.pool[state.index].difficulty);
    state.timeLeft = tl;
    state.timeMax = tl;
  }
  return state;
}

module.exports = { newGame, render, renderStats, handleAnswer, handleTimeout, nextQuestion };
