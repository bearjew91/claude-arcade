# Claude Arcade — Design Spec

**Date:** 2026-05-26
**Status:** Approved

## Overview

A Claude Code plugin that provides interactive terminal games and brain training exercises while Claude is busy working in auto mode. Games run in a separate Windows Terminal split pane so Claude is never interrupted.

## Architecture

### Components

1. **`claude-arcade` CLI game app** — standalone Node.js terminal application
2. **Claude Code plugin** — hook + skill that integrates with Claude Code
3. **Stats store** — persistent JSON file for scores and progress

### Directory Structure

```
claude-arcade/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── hooks/
│   └── hooks.json           # Hook definitions
│   └── launch-arcade.cmd    # Windows script to open split pane
├── skills/
│   └── stats/
│       └── SKILL.md         # /stats skill definition
├── lib/
│   ├── engine.js            # Game engine framework
│   ├── renderer.js          # ANSI terminal rendering
│   ├── input.js             # Keyboard input handling
│   └── stats.js             # Stats read/write
├── games/
│   ├── snake.js             # Snake game
│   ├── mental-math.js       # Mental math trainer
│   └── codeword.js          # Wordle-style word game
├── data/
│   └── words.json           # Word list for CodeWord
├── index.js                 # Entry point / game menu
└── package.json
```

## Plugin Integration

### Hook: PostToolCall

A `PostToolCall` hook fires after Claude executes a tool call. It runs `launch-arcade.cmd`, which:

1. Checks if an arcade pane is already open (avoids duplicates)
2. If not, launches the game in a Windows Terminal split pane: `wt -w 0 sp -d . node index.js`
3. The game runs in the right pane; Claude continues in the left

The hook script is lightweight and non-blocking — it launches the pane and exits immediately. It uses a lock file (`~/.claude/arcade.lock`) to track whether an arcade pane is already running, preventing duplicate launches on subsequent tool calls. The lock is removed when the game process exits.

### Skill: /stats

A read-only skill that displays lifetime stats from `~/.claude/arcade-stats.json` inline in Claude's output. Shows:

- Games played per game type
- High scores
- Current and best streaks
- Mental math accuracy %
- CodeWord guess distribution

## Game Engine

### Interface

Each game module exports:

```javascript
module.exports = {
  name: 'Snake',
  description: 'Navigate the snake to eat apples',
  init()          // Set up initial state
  render(state)   // Return ANSI string for current frame
  handleInput(key, state)  // Process keypress, return new state
  isGameOver(state)        // Check if game ended
  getScore(state)          // Return numeric score
}
```

### Engine Loop

```
init() → render loop:
  1. Clear screen, draw frame via render(state)
  2. Wait for keypress
  3. handleInput(key, state) → new state
  4. If isGameOver(state): show score, save stats, offer rematch
  5. Else: goto 1
```

For Snake, the loop also advances on a timer (every 200ms) for real-time movement.

### Renderer

Uses ANSI escape codes for:

- Cursor positioning (`\x1b[row;colH`)
- Colors (`\x1b[32m` green, `\x1b[31m` red, etc.)
- Box drawing with Unicode (`┌─┐│└┘`)
- Screen clearing (`\x1b[2J`)

No external dependencies — all built on Node.js `process.stdout.write()`.

### Input

Uses Node.js `process.stdin` in raw mode:

- Arrow keys for Snake direction
- Number keys / text input for Mental Math
- Letter keys for CodeWord
- `Escape` to quit to menu
- `Q` to quit entirely (closes pane)

## Game Designs

### Snake

- **Grid:** 20x20, rendered with Unicode box drawing
- **Snake:** Green blocks (`█`), head distinguished (`▓`)
- **Food:** Red (`●`)
- **Movement:** Real-time, 200ms tick rate, arrow keys change direction
- **Scoring:** +10 per apple, speed increases every 5 apples
- **Game over:** Hit wall or self

### Mental Math

- **Format:** Problem displayed, user types answer, immediate feedback
- **Difficulty levels:**
  - Level 1: Single-digit addition/subtraction
  - Level 2: Double-digit addition/subtraction
  - Level 3: Single-digit multiplication
  - Level 4: Mixed operations, double-digit
  - Level 5: Multi-step problems (e.g., `12 + 7 × 3`)
- **Progression:** Level up after 5 correct in a row, level down after 2 wrong
- **Scoring:** Points = level × speed_bonus (faster = more points)
- **Tracking:** Accuracy %, problems solved, current streak

### CodeWord (Wordle Clone)

- **Rules:** Guess a 5-letter word in 6 attempts
- **Display:** Grid of letter boxes with colors:
  - Green (`█`) = correct letter, correct position
  - Yellow (`▓`) = correct letter, wrong position
  - Gray (`░`) = letter not in word
- **Keyboard:** Shows which letters are used/available
- **Word list:** ~2000 common English words bundled in `data/words.json`
- **Scoring:** Fewer guesses = higher score (6 = 10pts, 1 = 60pts)
- **Tracking:** Win %, guess distribution histogram, streak

## Stats Persistence

Stored at `~/.claude/arcade-stats.json`:

```json
{
  "snake": {
    "gamesPlayed": 0,
    "highScore": 0,
    "totalApples": 0
  },
  "mentalMath": {
    "gamesPlayed": 0,
    "highScore": 0,
    "totalProblems": 0,
    "totalCorrect": 0,
    "bestStreak": 0,
    "highestLevel": 1
  },
  "codeword": {
    "gamesPlayed": 0,
    "wins": 0,
    "guessDistribution": [0, 0, 0, 0, 0, 0],
    "currentStreak": 0,
    "bestStreak": 0
  },
  "lastPlayed": null
}
```

## Technical Constraints

- **Zero external dependencies** — Node.js built-ins only (`readline`, `process.stdin/stdout`)
- **Windows Terminal required** for split pane (`wt` command) — fallback: opens new window with `start cmd /c`
- **Node.js 18+** — uses modern JS features
- **Non-blocking hook** — launch script exits immediately after spawning the pane
- **Duplicate prevention** — hook checks for existing arcade process before launching another

## Game Menu

On launch, the player sees:

```
╔══════════════════════════════╗
║       CLAUDE  ARCADE         ║
║                              ║
║   [1]  Snake                 ║
║   [2]  Mental Math           ║
║   [3]  CodeWord              ║
║   [S]  Stats                 ║
║   [Q]  Quit                  ║
║                              ║
╚══════════════════════════════╝
```

After a game ends, returns to this menu with the score displayed.
