const stats = require('./stats');

const CLEAR = '\x1b[2J\x1b[H';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

function parseKey(data) {
  if (data === '\x1b[A') return 'up';
  if (data === '\x1b[B') return 'down';
  if (data === '\x1b[C') return 'right';
  if (data === '\x1b[D') return 'left';
  if (data === '\r' || data === '\n') return 'enter';
  if (data === '\x7f' || data === '\x08') return 'backspace';
  if (data === '\x1b') return 'escape';
  if (data === '\x03') return 'ctrl-c';
  return data;
}

function run(game, onExit) {
  const stdin = process.stdin;
  const stdout = process.stdout;

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let state = game.init();
  let tickTimer = null;

  function draw() {
    stdout.write(CLEAR + HIDE_CURSOR);
    stdout.write(game.render(state));
  }

  function cleanup() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function saveStats(state) {
    const score = game.getScore(state);
    if (game.name === 'Snake') {
      stats.updateSnake(score, state.applesEaten || 0);
    } else if (game.name === 'Mental Math') {
      stats.updateMentalMath(
        score,
        state.total || 0,
        state.correct || 0,
        state.bestStreak || state.streak || 0,
        state.highestLevel || state.level || 1
      );
    } else if (game.name === 'CodeWord') {
      stats.updateCodeWord(state.won || false, state.guesses ? state.guesses.length : 6);
    }
  }

  function endGame() {
    cleanup();
    stdout.write(SHOW_CURSOR);
    saveStats(state);
    draw();

    const score = game.getScore(state);
    stdout.write(`\n\x1b[33m  Score: ${score}\x1b[0m\n`);
    stdout.write(`\n  \x1b[36m[R]\x1b[0m Rematch  \x1b[36m[M]\x1b[0m Menu  \x1b[36m[Q]\x1b[0m Quit\n`);

    const handleEnd = (data) => {
      const key = parseKey(data);
      if (key === 'r' || key === 'R') {
        stdin.removeListener('data', handleEnd);
        run(game, onExit);
      } else if (key === 'm' || key === 'M') {
        stdin.removeListener('data', handleEnd);
        onExit('menu');
      } else if (key === 'q' || key === 'Q' || key === 'escape') {
        stdin.removeListener('data', handleEnd);
        onExit('quit');
      }
    };
    stdin.on('data', handleEnd);
  }

  function handleKey(data) {
    const key = parseKey(data);

    if (key === 'ctrl-c') {
      cleanup();
      stdout.write(SHOW_CURSOR + '\n');
      process.exit(0);
    }

    if (key === 'escape') {
      cleanup();
      stdout.write(SHOW_CURSOR);
      if (game.isRealTime) {
        saveStats(state);
      }
      onExit('menu');
      return;
    }

    state = game.handleInput(key, state);

    if (game.isGameOver(state)) {
      stdin.removeListener('data', handleKey);
      endGame();
      return;
    }

    if (!game.isRealTime) {
      draw();
    }
  }

  stdin.on('data', handleKey);
  draw();

  if (game.isRealTime) {
    function startTick() {
      const rate = typeof game.tickRate === 'function' ? game.tickRate(state) : (state.tickRate || game.tickRate || 200);
      tickTimer = setInterval(() => {
        if (game.update) {
          state = game.update(state);
        }
        if (game.isGameOver(state)) {
          stdin.removeListener('data', handleKey);
          endGame();
          return;
        }
        draw();

        const newRate = typeof game.tickRate === 'function' ? game.tickRate(state) : (state.tickRate || game.tickRate || 200);
        if (newRate !== rate) {
          clearInterval(tickTimer);
          startTick();
        }
      }, rate);
    }
    startTick();
  }
}

module.exports = { run, CLEAR, HIDE_CURSOR, SHOW_CURSOR };
