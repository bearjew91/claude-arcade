'use strict';

const GRID_W = 20;
const GRID_H = 20;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

function randomFood(snake) {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  const free = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function init() {
  const centerX = Math.floor(GRID_W / 2);
  const centerY = Math.floor(GRID_H / 2);
  const snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];
  return {
    snake,
    food: randomFood(snake),
    direction: DIR.RIGHT,
    nextDirection: DIR.RIGHT,
    score: 0,
    applesEaten: 0,
    gameOver: false,
    tickRate: 200,
  };
}

function render(state) {
  const { snake, food, score, gameOver, tickRate } = state;
  const lines = [];

  // Build grid lookup
  const cellMap = {};
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    cellMap[`${seg.x},${seg.y}`] = i === 0 ? 'head' : 'body';
  }
  if (food) {
    cellMap[`${food.x},${food.y}`] = 'food';
  }

  // Top border
  lines.push('  ┌' + '──'.repeat(GRID_W) + '┐');

  // Grid rows
  for (let y = 0; y < GRID_H; y++) {
    let row = '  │';
    for (let x = 0; x < GRID_W; x++) {
      const key = `${x},${y}`;
      const cell = cellMap[key];
      if (cell === 'head') {
        row += GREEN + '▓ ' + RESET;
      } else if (cell === 'body') {
        row += GREEN + '█ ' + RESET;
      } else if (cell === 'food') {
        row += RED + '● ' + RESET;
      } else {
        row += '  ';
      }
    }
    row += '│';
    lines.push(row);
  }

  // Bottom border
  lines.push('  └' + '──'.repeat(GRID_W) + '┘');

  // Score and info
  lines.push('');
  lines.push(`  ${YELLOW}${BOLD}Score: ${score}${RESET}    ${DIM}Speed: ${tickRate}ms${RESET}`);
  lines.push('');
  lines.push(`  ${CYAN}Controls:${RESET} Arrow keys to move, Q to quit`);

  if (gameOver) {
    lines.push('');
    lines.push(`  ${RED}${BOLD}GAME OVER!${RESET} ${DIM}Press R to restart or Q to quit${RESET}`);
  }

  return lines.join('\n');
}

function opposite(d1, d2) {
  return d1.x + d2.x === 0 && d1.y + d2.y === 0;
}

function handleInput(key, state) {
  if (state.gameOver) {
    if (key === 'r' || key === 'R') {
      return init();
    }
    return state;
  }

  let newDir = null;
  if (key === 'up') newDir = DIR.UP;
  else if (key === 'down') newDir = DIR.DOWN;
  else if (key === 'left') newDir = DIR.LEFT;
  else if (key === 'right') newDir = DIR.RIGHT;

  if (newDir && !opposite(newDir, state.direction)) {
    return { ...state, nextDirection: newDir };
  }

  return state;
}

function update(state) {
  if (state.gameOver) return state;

  const direction = state.nextDirection;
  const head = state.snake[0];
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_W || newHead.y < 0 || newHead.y >= GRID_H) {
    return { ...state, direction, gameOver: true };
  }

  // Self collision (check against current body, excluding tail which will move)
  const ateFood = state.food && newHead.x === state.food.x && newHead.y === state.food.y;
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  for (const seg of bodyToCheck) {
    if (seg.x === newHead.x && seg.y === newHead.y) {
      return { ...state, direction, gameOver: true };
    }
  }

  // Move snake
  let newSnake;
  let newScore = state.score;
  let newApplesEaten = state.applesEaten;
  let newFood = state.food;
  let newTickRate = state.tickRate;

  if (ateFood) {
    newSnake = [newHead, ...state.snake];
    newScore += 10;
    newApplesEaten += 1;
    newFood = randomFood(newSnake);

    // Speed up every 5 apples
    if (newApplesEaten % 5 === 0 && newTickRate > 80) {
      newTickRate = Math.max(80, newTickRate - 20);
    }
  } else {
    newSnake = [newHead, ...state.snake.slice(0, -1)];
  }

  return {
    ...state,
    snake: newSnake,
    food: newFood,
    direction,
    nextDirection: direction,
    score: newScore,
    applesEaten: newApplesEaten,
    tickRate: newTickRate,
    gameOver: false,
  };
}

function isGameOver(state) {
  return state.gameOver;
}

function getScore(state) {
  return state.score;
}

module.exports = {
  name: 'Snake',
  description: 'Classic Snake game - eat apples to grow, avoid walls and yourself!',
  init,
  render,
  handleInput,
  update,
  isGameOver,
  getScore,
  isRealTime: true,
  tickRate: 200,
};
