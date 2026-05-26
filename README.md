# Claude Arcade 🕹️

Games for your terminal while Claude works — play in a split pane during auto mode!

## Games

### ⌨ Dev Hangman
Guess tech terms letter by letter. 180 words across 6 categories: languages, tools, concepts, devops, web, and git.

### 🧠 Tech Trivia
ABCD multiple choice questions about cyber security, dev, web, and tech. 60 questions from easy to hard, with streak bonuses and retro-style rankings.

## Install

```bash
claude plugin marketplace add https://github.com/bearjew91/claude-arcade
claude plugin install claude-arcade
```

## Usage

- `/play` — launch the arcade in a split pane
- `/stats` — view your scores
- Auto-launches when Claude starts working (via PostToolUse hook)

## Update

```bash
claude plugin marketplace update claude-arcade && claude plugin update claude-arcade@claude-arcade
```

## Controls

| Key | Action |
|-----|--------|
| `1` / `2` | Pick a game from the menu |
| `A-Z` | Guess letters (Hangman) or answer (Trivia) |
| `N` | New game |
| `M` | Back to menu |
| `S` | Stats |
| `ESC` | Quit |

## Requirements

- Node.js 18+
- Windows Terminal (for split pane — falls back to new window)
