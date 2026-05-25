# Dev Hangman 🎮

A polished terminal hangman game for Claude Code — guess tech terms while Claude works!

## What is it?

A Claude Code plugin that launches **Dev Hangman** in a Windows Terminal split pane. You play hangman with programming and devops terminology while Claude crunches through your tasks.

## Word Categories

- **Languages** — javascript, rust, python, kotlin, haskell...
- **Tools** — docker, kubernetes, webpack, postgres, redis...
- **Concepts** — recursion, middleware, polymorphism, closure...
- **DevOps** — pipeline, container, microservice, canary...
- **Web** — component, hydration, viewport, graphql...
- **Git** — rebase, cherry, bisect, worktree, reflog...

180 tech terms across 6 categories.

## Install

```bash
claude plugin marketplace add https://github.com/bearjew91/claude-arcade
claude plugin install claude-arcade
```

## Usage

- `/play` — launch the game in a split pane
- `/stats` — view your win rate, streaks, and category breakdown
- The game also auto-launches via hook when Claude starts working

## Controls

| Key | Action |
|-----|--------|
| `A-Z` | Guess a letter |
| `N` | New game (after win/loss) |
| `S` | View stats (after win/loss) |
| `ESC` | Quit |

## Features

- ASCII hangman art with color stages
- Category hints on each word
- Lives progress bar
- Color-coded keyboard showing used/correct/wrong letters
- Persistent stats with category breakdown
- Streak tracking
- Zero dependencies — Node.js built-ins only

## Requirements

- Node.js 18+
- Windows Terminal (for split pane)
