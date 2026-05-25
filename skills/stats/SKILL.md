---
name: stats
description: Show Dev Hangman stats — win rate, streaks, and category breakdown
---

# Hangman Stats

Read `~/.claude/arcade-stats.json` and display:

```
📊 DEV HANGMAN STATS

Games Played:  X
Wins:          X
Losses:        X
Win Rate:      X%
Streak:        X
Best Streak:   X

── By Category ──
LANGUAGES    X/X (X%)
TOOLS        X/X (X%)
CONCEPTS     X/X (X%)
DEVOPS       X/X (X%)
WEB          X/X (X%)
GIT          X/X (X%)
```

If the file doesn't exist, tell the user to play a round first with `/play`.
