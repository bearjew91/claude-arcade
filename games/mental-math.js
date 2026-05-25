const name = 'Mental Math';
const description = 'A mental math trainer that adapts to your skill level';
const isRealTime = false;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(level) {
  let text, answer;

  switch (level) {
    case 1: {
      const a = randomInt(1, 9);
      const b = randomInt(1, 9);
      if (Math.random() < 0.5) {
        text = `${a} + ${b}`;
        answer = a + b;
      } else {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        text = `${big} - ${small}`;
        answer = big - small;
      }
      break;
    }
    case 2: {
      const a = randomInt(10, 99);
      const b = randomInt(10, 99);
      if (Math.random() < 0.5) {
        text = `${a} + ${b}`;
        answer = a + b;
      } else {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        text = `${big} - ${small}`;
        answer = big - small;
      }
      break;
    }
    case 3: {
      const a = randomInt(2, 9);
      const b = randomInt(2, 9);
      text = `${a} × ${b}`;
      answer = a * b;
      break;
    }
    case 4: {
      const op = Math.random();
      if (op < 0.33) {
        const a = randomInt(10, 99);
        const b = randomInt(10, 99);
        text = `${a} + ${b}`;
        answer = a + b;
      } else if (op < 0.66) {
        const a = randomInt(10, 99);
        const b = randomInt(10, 99);
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        text = `${big} - ${small}`;
        answer = big - small;
      } else {
        const a = randomInt(2, 12);
        const b = randomInt(2, 9);
        text = `${a} × ${b}`;
        answer = a * b;
      }
      break;
    }
    case 5: {
      const a = randomInt(10, 50);
      const b = randomInt(2, 9);
      const c = randomInt(2, 9);
      const product = b * c;
      if (Math.random() < 0.5) {
        text = `${a} + ${product}`;
        answer = a + product;
      } else {
        const base = a + product;
        text = `${base} - ${product}`;
        answer = a;
      }
      break;
    }
    default: {
      const a = randomInt(1, 9);
      const b = randomInt(1, 9);
      text = `${a} + ${b}`;
      answer = a + b;
    }
  }

  return { text, answer };
}

function init() {
  const problem = generateProblem(1);
  return {
    level: 1,
    score: 0,
    streak: 0,
    bestStreak: 0,
    wrongStreak: 0,
    correct: 0,
    total: 0,
    highestLevel: 1,
    input: '',
    problem,
    feedback: null,
    problemStart: Date.now(),
  };
}

function render(state) {
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const yellow = '\x1b[33m';
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const dim = '\x1b[2m';
  const white = '\x1b[37m';
  const magenta = '\x1b[35m';

  const lines = [];

  // Header box
  lines.push(`${cyan}${bold}┌────────────────────────────────┐${reset}`);
  lines.push(`${cyan}${bold}│${reset}   ${magenta}${bold}\u{1f9e0} Mental Math Trainer${reset}   ${cyan}${bold}  │${reset}`);
  lines.push(`${cyan}${bold}└────────────────────────────────┘${reset}`);
  lines.push('');

  // Stats line
  const accuracy = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  lines.push(
    `  ${yellow}${bold}Level: ${state.level}${reset}` +
    `    ${cyan}${bold}Score: ${state.score}${reset}` +
    `    ${green}Streak: ${state.streak}${reset}` +
    `    ${dim}Accuracy: ${accuracy}% (${state.correct}/${state.total})${reset}`
  );
  lines.push('');

  // Level description
  const levelDesc = [
    '',
    'Single-digit +/-',
    'Double-digit +/-',
    'Single-digit ×',
    'Mixed ops, double-digit',
    'Multi-step problems',
  ];
  lines.push(`  ${dim}${levelDesc[state.level] || ''}${reset}`);
  lines.push('');

  // Problem display
  lines.push(`  ${white}${bold}  ${state.problem.text} = ?${reset}`);
  lines.push('');

  // Input
  lines.push(`  ${white}> ${state.input}${bold}_${reset}`);
  lines.push('');

  // Feedback
  if (state.feedback) {
    if (state.feedback.correct) {
      let msg = `  ${green}${bold}✓ Correct!${reset}`;
      if (state.feedback.fast) {
        msg += `  ${yellow}${bold}⚡ Speed Bonus! (${state.feedback.time}s)${reset}`;
      }
      msg += `  ${dim}+${state.feedback.points} pts${reset}`;
      lines.push(msg);
    } else {
      lines.push(
        `  ${red}${bold}✗ Wrong!${reset}` +
        `  ${dim}The answer was ${bold}${state.feedback.answer}${reset}${dim}, you entered ${state.feedback.given}${reset}`
      );
    }
    lines.push('');
  }

  // Instructions
  lines.push(`  ${dim}Type your answer and press Enter. Escape to quit.${reset}`);
  lines.push(`  ${dim}Answer within 3 seconds for double points!${reset}`);

  return lines.join('\n');
}

function handleInput(key, state) {
  const newState = { ...state };

  // Digit input (including negative sign)
  if (/^[0-9]$/.test(key)) {
    newState.input = state.input + key;
    return newState;
  }

  // Allow minus sign at start for negative answers
  if (key === '-' && state.input === '') {
    newState.input = '-';
    return newState;
  }

  // Backspace
  if (key === 'backspace') {
    newState.input = state.input.slice(0, -1);
    return newState;
  }

  // Enter - submit answer
  if (key === 'enter' || key === 'return') {
    if (state.input === '' || state.input === '-') return newState;

    const userAnswer = parseInt(state.input, 10);
    if (isNaN(userAnswer)) {
      newState.input = '';
      return newState;
    }

    const elapsed = (Date.now() - state.problemStart) / 1000;
    const isCorrect = userAnswer === state.problem.answer;
    const fast = elapsed <= 3;

    newState.total = state.total + 1;

    if (isCorrect) {
      const basePoints = state.level * 10;
      const points = fast ? basePoints * 2 : basePoints;
      newState.score = state.score + points;
      newState.streak = state.streak + 1;
      newState.wrongStreak = 0;
      newState.correct = state.correct + 1;

      newState.feedback = {
        correct: true,
        fast,
        time: elapsed.toFixed(1),
        points,
      };

      newState.bestStreak = Math.max(newState.streak, state.bestStreak);

      // Level up after 5 correct in a row
      if (newState.streak >= 5 && newState.streak % 5 === 0 && state.level < 5) {
        newState.level = state.level + 1;
        newState.highestLevel = Math.max(newState.level, state.highestLevel);
      }
    } else {
      newState.streak = 0;
      newState.wrongStreak = state.wrongStreak + 1;

      newState.feedback = {
        correct: false,
        answer: state.problem.answer,
        given: userAnswer,
      };

      // Level down after 2 wrong in a row
      if (newState.wrongStreak >= 2 && state.level > 1) {
        newState.level = state.level - 1;
        newState.wrongStreak = 0;
      }
    }

    // Generate next problem
    newState.problem = generateProblem(newState.level);
    newState.input = '';
    newState.problemStart = Date.now();

    return newState;
  }

  return newState;
}

function isGameOver(_state) {
  return false;
}

function getScore(state) {
  return state.score;
}

module.exports = {
  name,
  description,
  init,
  render,
  handleInput,
  isGameOver,
  getScore,
  isRealTime,
};
