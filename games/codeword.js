const path = require('path');
const fs = require('fs');

const WORDS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'words.json'), 'utf-8')
);

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

// ANSI color helpers
const RESET = '\x1b[0m';
const GREEN_BG = '\x1b[42m\x1b[37m';   // green bg, white text
const YELLOW_BG = '\x1b[43m\x1b[30m';  // yellow bg, black text
const GRAY_BG = '\x1b[100m\x1b[37m';   // gray bg, white text
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const WHITE = '\x1b[37m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';

/**
 * Evaluate a guess against the target word.
 * Returns an array of 5 objects: { letter, status }
 * where status is 'correct', 'present', or 'absent'.
 *
 * Handles duplicate letters properly:
 * - First pass: mark exact matches (correct)
 * - Second pass: mark present/absent, respecting remaining letter counts
 */
function evaluateGuess(guess, target) {
  const result = new Array(WORD_LENGTH);
  const targetCounts = {};

  // Count letters in target
  for (const ch of target) {
    targetCounts[ch] = (targetCounts[ch] || 0) + 1;
  }

  // First pass: mark correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
      result[i] = { letter: guess[i], status: 'correct' };
      targetCounts[guess[i]]--;
    }
  }

  // Second pass: mark present or absent
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i]) continue; // already marked correct
    const ch = guess[i];
    if (targetCounts[ch] && targetCounts[ch] > 0) {
      result[i] = { letter: ch, status: 'present' };
      targetCounts[ch]--;
    } else {
      result[i] = { letter: ch, status: 'absent' };
    }
  }

  return result;
}

function init() {
  const target = WORDS[Math.floor(Math.random() * WORDS.length)];
  return {
    target,
    guesses: [],       // array of evaluated guess results
    guessWords: [],    // the raw guess strings
    currentGuess: '',  // letters typed so far for current guess
    gameOver: false,
    won: false,
    message: '',
    keyboard: {}       // letter -> best status ('correct' > 'present' > 'absent')
  };
}

function updateKeyboard(state, result) {
  const priority = { correct: 3, present: 2, absent: 1 };
  for (const { letter, status } of result) {
    const current = state.keyboard[letter];
    if (!current || priority[status] > priority[current]) {
      state.keyboard[letter] = status;
    }
  }
}

function handleInput(key, state) {
  if (state.gameOver) return state;

  state.message = '';

  // Letter input
  if (/^[a-zA-Z]$/.test(key)) {
    if (state.currentGuess.length < WORD_LENGTH) {
      state.currentGuess += key.toLowerCase();
    }
    return state;
  }

  // Backspace
  if (key === 'backspace') {
    state.currentGuess = state.currentGuess.slice(0, -1);
    return state;
  }

  // Enter / submit
  if (key === 'enter' || key === 'return') {
    if (state.currentGuess.length !== WORD_LENGTH) {
      state.message = 'Not enough letters!';
      return state;
    }

    if (!WORDS.includes(state.currentGuess)) {
      state.message = 'Not in word list!';
      return state;
    }

    const result = evaluateGuess(state.currentGuess, state.target);
    state.guesses.push(result);
    state.guessWords.push(state.currentGuess);
    updateKeyboard(state, result);

    if (state.currentGuess === state.target) {
      state.won = true;
      state.gameOver = true;
      state.message = getWinMessage(state.guesses.length);
    } else if (state.guesses.length >= MAX_GUESSES) {
      state.won = false;
      state.gameOver = true;
      state.message = `The word was: ${state.target.toUpperCase()}`;
    }

    state.currentGuess = '';
    return state;
  }

  return state;
}

function getWinMessage(numGuesses) {
  const messages = {
    1: 'GENIUS! First try!',
    2: 'MAGNIFICENT!',
    3: 'IMPRESSIVE!',
    4: 'SPLENDID!',
    5: 'GREAT!',
    6: 'PHEW! Close one!'
  };
  return messages[numGuesses] || 'You won!';
}

function colorCell(letter, status) {
  const upper = letter.toUpperCase();
  const padded = ` ${upper} `;
  switch (status) {
    case 'correct': return `${GREEN_BG}${padded}${RESET}`;
    case 'present': return `${YELLOW_BG}${padded}${RESET}`;
    case 'absent':  return `${GRAY_BG}${padded}${RESET}`;
    default:        return `${DIM}${padded}${RESET}`;
  }
}

function render(state) {
  const lines = [];

  // Title box
  lines.push('');
  lines.push(`${CYAN}${BOLD}  ╔══════════════════════════╗${RESET}`);
  lines.push(`${CYAN}${BOLD}  ║      C O D E W O R D     ║${RESET}`);
  lines.push(`${CYAN}${BOLD}  ╚══════════════════════════╝${RESET}`);
  lines.push('');
  lines.push(`${DIM}  Guess the 5-letter word in 6 tries${RESET}`);
  lines.push('');

  // Game grid
  for (let row = 0; row < MAX_GUESSES; row++) {
    let rowStr = '    ';

    if (row < state.guesses.length) {
      // Submitted guess - show colored results
      for (let col = 0; col < WORD_LENGTH; col++) {
        const { letter, status } = state.guesses[row][col];
        rowStr += colorCell(letter, status) + ' ';
      }
    } else if (row === state.guesses.length && !state.gameOver) {
      // Current input row
      for (let col = 0; col < WORD_LENGTH; col++) {
        if (col < state.currentGuess.length) {
          rowStr += `${BOLD}${WHITE} ${state.currentGuess[col].toUpperCase()} ${RESET} `;
        } else {
          rowStr += `${DIM} _ ${RESET} `;
        }
      }
    } else {
      // Empty row
      for (let col = 0; col < WORD_LENGTH; col++) {
        rowStr += `${DIM} . ${RESET} `;
      }
    }

    lines.push(rowStr);
    lines.push('');
  }

  // Keyboard display
  lines.push('');
  const keyboardRows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];

  for (const kbRow of keyboardRows) {
    let rowStr = '    ';
    if (kbRow === 'asdfghjkl') rowStr = '     ';
    if (kbRow === 'zxcvbnm') rowStr = '       ';

    for (const ch of kbRow) {
      const status = state.keyboard[ch];
      if (status === 'correct') {
        rowStr += `${GREEN_BG} ${ch.toUpperCase()} ${RESET}`;
      } else if (status === 'present') {
        rowStr += `${YELLOW_BG} ${ch.toUpperCase()} ${RESET}`;
      } else if (status === 'absent') {
        rowStr += `${DIM} ${ch.toUpperCase()} ${RESET}`;
      } else {
        rowStr += ` ${ch.toUpperCase()} `;
      }
    }
    lines.push(rowStr);
  }

  lines.push('');

  // Message line
  if (state.message) {
    if (state.won) {
      lines.push(`  ${GREEN}${BOLD}${state.message}${RESET}`);
    } else if (state.gameOver) {
      lines.push(`  ${RED}${BOLD}${state.message}${RESET}`);
    } else {
      lines.push(`  ${YELLOW}${state.message}${RESET}`);
    }
    lines.push('');
  }

  // Score display when game over
  if (state.gameOver) {
    const score = getScore(state);
    lines.push(`  ${BOLD}Score: ${score} points${RESET}`);
    lines.push('');
  }

  // Guess counter
  if (!state.gameOver) {
    lines.push(`  ${DIM}Guess ${state.guesses.length + 1} of ${MAX_GUESSES}${RESET}`);
    lines.push('');
  }

  return lines.join('\n');
}

function isGameOver(state) {
  return state.gameOver;
}

function getScore(state) {
  if (!state.won) return 0;
  const scoreMap = { 1: 60, 2: 50, 3: 40, 4: 30, 5: 20, 6: 10 };
  return scoreMap[state.guesses.length] || 0;
}

module.exports = {
  name: 'CodeWord',
  description: 'Guess the 5-letter word in 6 tries - a Wordle clone for your terminal!',
  init,
  render,
  handleInput,
  isGameOver,
  getScore,
  isRealTime: false
};
