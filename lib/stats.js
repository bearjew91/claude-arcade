const fs = require('fs');
const path = require('path');
const os = require('os');

const STATS_PATH = path.join(os.homedir(), '.claude', 'arcade-stats.json');

const DEFAULT_STATS = {
  snake: {
    gamesPlayed: 0,
    highScore: 0,
    totalApples: 0
  },
  mentalMath: {
    gamesPlayed: 0,
    highScore: 0,
    totalProblems: 0,
    totalCorrect: 0,
    bestStreak: 0,
    highestLevel: 1
  },
  codeword: {
    gamesPlayed: 0,
    wins: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    currentStreak: 0,
    bestStreak: 0
  },
  lastPlayed: null
};

function load() {
  try {
    const data = fs.readFileSync(STATS_PATH, 'utf8');
    const stats = JSON.parse(data);
    return { ...DEFAULT_STATS, ...stats };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function save(stats) {
  const dir = path.dirname(STATS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
}

function updateSnake(score, apples) {
  const stats = load();
  stats.snake.gamesPlayed++;
  stats.snake.highScore = Math.max(stats.snake.highScore, score);
  stats.snake.totalApples += apples;
  stats.lastPlayed = new Date().toISOString();
  save(stats);
  return stats;
}

function updateMentalMath(score, problems, correct, streak, level) {
  const stats = load();
  stats.mentalMath.gamesPlayed++;
  stats.mentalMath.highScore = Math.max(stats.mentalMath.highScore, score);
  stats.mentalMath.totalProblems += problems;
  stats.mentalMath.totalCorrect += correct;
  stats.mentalMath.bestStreak = Math.max(stats.mentalMath.bestStreak, streak);
  stats.mentalMath.highestLevel = Math.max(stats.mentalMath.highestLevel, level);
  stats.lastPlayed = new Date().toISOString();
  save(stats);
  return stats;
}

function updateCodeWord(won, guesses) {
  const stats = load();
  stats.codeword.gamesPlayed++;
  if (won) {
    stats.codeword.wins++;
    stats.codeword.guessDistribution[guesses - 1]++;
    stats.codeword.currentStreak++;
    stats.codeword.bestStreak = Math.max(stats.codeword.bestStreak, stats.codeword.currentStreak);
  } else {
    stats.codeword.currentStreak = 0;
  }
  stats.lastPlayed = new Date().toISOString();
  save(stats);
  return stats;
}

function formatStats() {
  const s = load();
  const mathAcc = s.mentalMath.totalProblems > 0
    ? Math.round((s.mentalMath.totalCorrect / s.mentalMath.totalProblems) * 100)
    : 0;
  const cwWinRate = s.codeword.gamesPlayed > 0
    ? Math.round((s.codeword.wins / s.codeword.gamesPlayed) * 100)
    : 0;
  const dist = s.codeword.guessDistribution;

  return `
\x1b[36m\x1b[1m╔══════════════════════════════════╗
║        🕹️  CLAUDE ARCADE STATS     ║
╚══════════════════════════════════╝\x1b[0m

\x1b[32m🐍 Snake\x1b[0m
   Games: ${s.snake.gamesPlayed} | High Score: ${s.snake.highScore} | Apples: ${s.snake.totalApples}

\x1b[33m🧮 Mental Math\x1b[0m
   Games: ${s.mentalMath.gamesPlayed} | High Score: ${s.mentalMath.highScore} | Accuracy: ${mathAcc}%
   Best Streak: ${s.mentalMath.bestStreak} | Highest Level: ${s.mentalMath.highestLevel}

\x1b[35m📝 CodeWord\x1b[0m
   Games: ${s.codeword.gamesPlayed} | Win Rate: ${cwWinRate}% | Streak: ${s.codeword.currentStreak}
   Best Streak: ${s.codeword.bestStreak}
   Guesses:  1:${dist[0]} 2:${dist[1]} 3:${dist[2]} 4:${dist[3]} 5:${dist[4]} 6:${dist[5]}
`;
}

module.exports = { load, save, updateSnake, updateMentalMath, updateCodeWord, formatStats };
