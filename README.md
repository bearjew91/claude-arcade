# Claude Arcade 🕹️

Terminal games and brain training for Claude Code — play while Claude works!

When Claude is busy in auto mode, a split pane opens with games you can play right next to it.

## Games

- **🐍 Snake** — Classic snake with real-time controls. Eat apples, grow longer, don't crash.
- **🧮 Mental Math** — Rapid-fire math problems with adaptive difficulty (5 levels). Train your mental arithmetic.
- **📝 CodeWord** — Wordle-style word guessing. 6 attempts to find the 5-letter word.

## Install as Claude Code Plugin

```bash
claude plugin add /path/to/claude-arcade
```

Or from a git repo:

```bash
claude plugin add https://github.com/youruser/claude-arcade
```

## How It Works

1. Claude starts working in auto mode
2. A PostToolCall hook opens a Windows Terminal split pane with the game menu
3. Play games in the right pane while Claude works in the left
4. Close the pane when you're done — or keep playing!

## Manual Launch

You can also run the arcade directly:

```bash
node index.js
```

Or if installed globally:

```bash
claude-arcade
```

## Stats

Your scores, streaks, and progress are saved to `~/.claude/arcade-stats.json` and persist across sessions. View them from the game menu (press `S`) or use the `/stats` skill in Claude Code.

## Controls

| Key | Action |
|-----|--------|
| `1/2/3` | Select a game from the menu |
| `Arrow keys` | Move (Snake) |
| `Letters` | Type answers (Math, CodeWord) |
| `Enter` | Submit answer |
| `Backspace` | Delete character |
| `Escape` | Back to menu |
| `R` | Rematch after game over |
| `Q` | Quit |

## Requirements

- Node.js 18+
- Windows Terminal (for split pane feature, falls back to new window otherwise)
