#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCK_FILE = path.join(os.homedir(), '.claude', 'arcade.lock');
const STATS_FILE = path.join(os.homedir(), '.claude', 'arcade-stats.json');
const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'words.json'), 'utf8'));
const trivia = require('./trivia');

// ── Lock ──

function writeLock() {
  const dir = path.dirname(LOCK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}
function removeLock() { try { fs.unlinkSync(LOCK_FILE); } catch {} }
process.on('exit', removeLock);
process.on('SIGINT', () => { removeLock(); process.exit(0); });
process.on('SIGTERM', () => { removeLock(); process.exit(0); });

// ── ANSI ──

const E = '\x1b';
const R = `${E}[0m`;
const B = `${E}[1m`;
const D = `${E}[2m`;
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
const HIDE = `${E}[?25l`;
const SHOW = `${E}[?25h`;
const CLR = `${E}[2J${E}[H`;

// ── Hangman Stats ──

function loadHS() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
  catch { return { played: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, categoryStats: {} }; }
}
function saveHS(s) {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2));
}

// ── Hangman Art ──

const HANG = [
  [`  ${GRY}|${R}`, `  ${GRY}|${R}`, `  ${GRY}|${R}`, `  ${GRY}|${R}`, `  ${GRY}|_______${R}`],
  [`  ${GRY}|---+${R}`, `  ${GRY}|${R}   ${YEL}O${R}`, `  ${GRY}|${R}`, `  ${GRY}|${R}`, `  ${GRY}|_______${R}`],
  [`  ${GRY}|---+${R}`, `  ${GRY}|${R}   ${YEL}O${R}`, `  ${GRY}|${R}   ${WHT}|${R}`, `  ${GRY}|${R}`, `  ${GRY}|_______${R}`],
  [`  ${GRY}|---+${R}`, `  ${GRY}|${R}   ${YEL}O${R}`, `  ${GRY}|${R}  ${WHT}/|${R}`, `  ${GRY}|${R}`, `  ${GRY}|_______${R}`],
  [`  ${GRY}|---+${R}`, `  ${GRY}|${R}   ${YEL}O${R}`, `  ${GRY}|${R}  ${WHT}/|\\${R}`, `  ${GRY}|${R}`, `  ${GRY}|_______${R}`],
  [`  ${GRY}|---+${R}`, `  ${GRY}|${R}   ${YEL}O${R}`, `  ${GRY}|${R}  ${WHT}/|\\${R}`, `  ${GRY}|${R}  ${WHT}/${R}`, `  ${GRY}|_______${R}`],
  [`  ${GRY}|---+${R}`, `  ${GRY}|${R}   ${RED}X${R}`, `  ${GRY}|${R}  ${RED}/|\\${R}`, `  ${GRY}|${R}  ${RED}/ \\${R}`, `  ${GRY}|_______${R}`],
];

// ── Hangman Game ──

function pickWord() {
  const cats = Object.keys(WORDS);
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const list = WORDS[cat];
  return { word: list[Math.floor(Math.random() * list.length)].toUpperCase(), category: cat };
}

function newHG() {
  const { word, category } = pickWord();
  return { word, category, guessed: new Set(), wrong: [], maxWrong: 6, won: false, lost: false, msg: '', msgClr: CYN };
}

function renderHG(s) {
  const o = [];
  o.push(CLR + HIDE);

  o.push(`${CYN}${B}  .---------------------------------------.${R}`);
  o.push(`${CYN}${B}  |  ${MAG}>>>${R}${CYN}${B} D E V  H A N G M A N ${MAG}<<<${CYN}${B}       |${R}`);
  o.push(`${CYN}${B}  '---------------------------------------'${R}`);

  // Stats line
  const hs = loadHS();
  o.push(`  ${BYEL} ${s.category.toUpperCase()} ${R}  ${GRY}W:${hs.wins} L:${hs.losses} streak:${hs.streak}${R}`);
  o.push('');

  // Hangman
  const stage = Math.min(s.wrong.length, HANG.length - 1);
  for (const line of HANG[stage]) o.push(line);
  o.push('');

  // Word
  const wordDisplay = s.word.split('').map(ch => {
    if (s.guessed.has(ch)) return `${GRN}${B}${ch}${R}`;
    if (s.won || s.lost) return `${RED}${B}${ch}${R}`;
    return `${D}_${R}`;
  }).join(' ');
  o.push(`  ${wordDisplay}`);
  o.push('');

  // Lives bar
  const lives = s.maxWrong - s.wrong.length;
  const lClr = lives <= 2 ? RED : lives <= 4 ? YEL : GRN;
  o.push(`  ${lClr}${'<3'.repeat(lives)}${GRY}${'..'.repeat(s.wrong.length)}${R}`);

  // Wrong letters
  if (s.wrong.length > 0) {
    o.push(`  ${D}wrong:${R} ${s.wrong.map(c => `${RED}${c}${R}`).join(' ')}`);
  }
  o.push('');

  // Keyboard
  for (const [i, row] of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].entries()) {
    const pad = i === 1 ? '  ' : i === 2 ? '    ' : '';
    const keys = row.split('').map(ch => {
      if (s.word.includes(ch) && s.guessed.has(ch)) return `${BGRN} ${ch} ${R}`;
      if (s.wrong.includes(ch)) return `${BRED} ${ch} ${R}`;
      if (s.guessed.has(ch)) return `${GRY} ${ch} ${R}`;
      return `${WHT} ${ch} ${R}`;
    }).join('');
    o.push(`  ${pad}${keys}`);
  }
  o.push('');

  // Message
  if (s.msg) o.push(`  ${s.msgClr}${B}${s.msg}${R}`);
  o.push('');

  // Controls
  if (s.won || s.lost) {
    o.push(`  ${CYN}[N]${R} again  ${CYN}[M]${R} menu  ${CYN}[Q]${R} quit`);
  } else {
    o.push(`  ${D}type a letter | [ESC] quit${R}`);
  }

  process.stdout.write(o.join('\n') + '\n');
}

function guessHG(ch, s) {
  const l = ch.toUpperCase();
  if (!/^[A-Z]$/.test(l) || s.won || s.lost) return s;
  if (s.guessed.has(l)) { s.msg = `already guessed ${l}`; s.msgClr = YEL; return s; }

  s.guessed.add(l);
  if (s.word.includes(l)) {
    const left = s.word.split('').filter(c => !s.guessed.has(c)).length;
    if (left === 0) {
      s.won = true; s.msg = '>> NAILED IT! <<'; s.msgClr = GRN;
      recordHG(s, true);
    } else {
      s.msg = `+ ${left} left`; s.msgClr = GRN;
    }
  } else {
    s.wrong.push(l);
    const lives = s.maxWrong - s.wrong.length;
    if (lives <= 0) {
      s.lost = true; s.msg = `DEAD! word was: ${s.word}`; s.msgClr = RED;
      recordHG(s, false);
    } else if (lives === 1) {
      s.msg = 'x LAST LIFE!'; s.msgClr = RED;
    } else {
      s.msg = `x miss | ${lives} left`; s.msgClr = YEL;
    }
  }
  return s;
}

function recordHG(s, won) {
  const st = loadHS();
  st.played++;
  if (won) { st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
  else { st.losses++; st.streak = 0; }
  if (!st.categoryStats) st.categoryStats = {};
  if (!st.categoryStats[s.category]) st.categoryStats[s.category] = { played: 0, wins: 0 };
  st.categoryStats[s.category].played++;
  if (won) st.categoryStats[s.category].wins++;
  saveHS(st);
}

// ═══════════════════════════════════════════
//  M A I N   M E N U
// ═══════════════════════════════════════════

function renderMenu() {
  const o = [];
  o.push(CLR + HIDE);
  o.push('');
  o.push(`${CYN}${B}  .========================================.${R}`);
  o.push(`${CYN}${B}  |                                        |${R}`);
  o.push(`${CYN}${B}  |  ${MAG}>>>${R} ${WHT}${B}C L A U D E  A R C A D E${R} ${MAG}<<<${CYN}${B}  |${R}`);
  o.push(`${CYN}${B}  |  ${GRY}${D}    play while claude works${R}${CYN}${B}          |${R}`);
  o.push(`${CYN}${B}  |                                        |${R}`);
  o.push(`${CYN}${B}  '========================================' ${R}`);
  o.push('');
  o.push(`  ${GRN}${B}[1]${R} ${WHT}Dev Hangman${R}    ${D}guess tech terms${R}`);
  o.push(`  ${YEL}${B}[2]${R} ${WHT}Tech Trivia${R}    ${D}timed ABCD quiz${R}`);
  o.push('');
  o.push(`  ${GRY}[Q] quit${R}`);
  o.push('');
  o.push(`  ${D}press 1 or 2${R}`);

  process.stdout.write(o.join('\n') + '\n');
}

// ═══════════════════════════════════════════
//  G A M E   L O O P S
// ═══════════════════════════════════════════

function runHangman(stdin, goMenu) {
  let s = newHG();
  renderHG(s);
  const handler = (key) => {
    if (key === '\x03') { process.stdout.write(SHOW + CLR); process.exit(0); }
    if (key === '\x1b') { stdin.removeListener('data', handler); goMenu(); return; }
    if (s.won || s.lost) {
      if (key === 'n' || key === 'N') { s = newHG(); renderHG(s); }
      else if (key === 'm' || key === 'M') { stdin.removeListener('data', handler); goMenu(); }
      else if (key === 'q' || key === 'Q') { process.stdout.write(SHOW + CLR); process.exit(0); }
      return;
    }
    if (/^[a-zA-Z]$/.test(key)) { s = guessHG(key, s); renderHG(s); }
  };
  stdin.on('data', handler);
}

function runTrivia(stdin, goMenu) {
  let state = trivia.newGame();
  let showingStats = false;
  let timer = null;

  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (state.revealed || state.gameOver || showingStats) return;
      state.timeLeft--;
      if (state.timeLeft <= 0) state = trivia.handleTimeout(state);
      trivia.render(state);
    }, 1000);
  }

  function cleanup() { if (timer) { clearInterval(timer); timer = null; } }

  trivia.render(state);
  startTimer();

  const handler = (key) => {
    if (key === '\x03') { cleanup(); process.stdout.write(SHOW + CLR); process.exit(0); }
    if (key === '\x1b') { cleanup(); stdin.removeListener('data', handler); goMenu(); return; }

    if (showingStats) {
      showingStats = false;
      trivia.render(state);
      if (!state.gameOver) startTimer();
      return;
    }

    if (state.gameOver) {
      cleanup();
      if (key === 'n' || key === 'N') { state = trivia.newGame(); trivia.render(state); startTimer(); }
      else if (key === 's' || key === 'S') { showingStats = true; trivia.renderStats(); }
      else if (key === 'm' || key === 'M') { stdin.removeListener('data', handler); goMenu(); }
      else if (key === 'q' || key === 'Q') { process.stdout.write(SHOW + CLR); process.exit(0); }
      return;
    }

    if (state.revealed) {
      state = trivia.nextQuestion(state);
      trivia.render(state);
      if (!state.gameOver) startTimer();
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

// ═══════════════════════════════════════════
//  M A I N
// ═══════════════════════════════════════════

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
      process.stdout.write(SHOW + CLR); process.exit(0);
    }
    if (key === '1') { stdin.removeListener('data', menuHandler); runHangman(stdin, goMenu); }
    if (key === '2') { stdin.removeListener('data', menuHandler); runTrivia(stdin, goMenu); }
  }

  renderMenu();
  stdin.on('data', menuHandler);
}

main();
