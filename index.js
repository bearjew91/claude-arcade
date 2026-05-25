#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { run, CLEAR, HIDE_CURSOR, SHOW_CURSOR } = require('./lib/engine');
const stats = require('./lib/stats');

const LOCK_FILE = path.join(os.homedir(), '.claude', 'arcade.lock');

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

const games = {
  snake: () => require('./games/snake'),
  math: () => require('./games/mental-math'),
  codeword: () => require('./games/codeword'),
};

function showMenu() {
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  process.stdout.write(CLEAR + HIDE_CURSOR);
  process.stdout.write(`
\x1b[36m\x1b[1m  ╔══════════════════════════════════╗
  ║                                  ║
  ║       🕹️   CLAUDE  ARCADE        ║
  ║                                  ║
  ║   \x1b[32m[1]\x1b[36m  🐍  Snake                  ║
  ║   \x1b[33m[2]\x1b[36m  🧮  Mental Math             ║
  ║   \x1b[35m[3]\x1b[36m  📝  CodeWord                ║
  ║                                  ║
  ║   \x1b[37m[S]\x1b[36m  📊  Stats                   ║
  ║   \x1b[37m[Q]\x1b[36m  🚪  Quit                    ║
  ║                                  ║
  ╚══════════════════════════════════╝\x1b[0m

  \x1b[90mPlay while Claude works!\x1b[0m
`);

  const handleMenu = (key) => {
    if (key === '\x03') {
      process.stdout.write(SHOW_CURSOR + '\n');
      process.exit(0);
    }

    let game = null;
    if (key === '1') game = games.snake();
    else if (key === '2') game = games.math();
    else if (key === '3') game = games.codeword();
    else if (key === 's' || key === 'S') {
      process.stdout.write(CLEAR);
      process.stdout.write(stats.formatStats());
      process.stdout.write('\n  \x1b[90mPress any key to return to menu...\x1b[0m\n');
      const waitKey = () => {
        stdin.removeListener('data', waitKey);
        showMenu();
      };
      stdin.removeListener('data', handleMenu);
      stdin.on('data', waitKey);
      return;
    } else if (key === 'q' || key === 'Q' || key === '\x1b') {
      process.stdout.write(SHOW_CURSOR + CLEAR);
      process.exit(0);
    } else {
      return;
    }

    if (game) {
      stdin.removeListener('data', handleMenu);
      stdin.removeAllListeners('data');
      run(game, (action) => {
        stdin.removeAllListeners('data');
        if (action === 'menu') {
          showMenu();
        } else {
          process.stdout.write(SHOW_CURSOR + CLEAR);
          process.exit(0);
        }
      });
    }
  };

  stdin.on('data', handleMenu);
}

writeLock();
showMenu();
