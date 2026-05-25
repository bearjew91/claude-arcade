---
name: stats
description: Show Claude Arcade lifetime stats — high scores, streaks, and brain training progress
---

# Arcade Stats

Display the user's Claude Arcade statistics.

Read the stats file from `~/.claude/arcade-stats.json` and present the data in a formatted table.

If the file doesn't exist, tell the user they haven't played any games yet and suggest they try `/play` or wait for the arcade to launch automatically.

Format the output like this:

```
🕹️ CLAUDE ARCADE STATS

🐍 Snake
   Games: X | High Score: X | Total Apples: X

🧮 Mental Math
   Games: X | High Score: X | Accuracy: X%
   Best Streak: X | Highest Level: X

📝 CodeWord
   Games: X | Win Rate: X% | Current Streak: X
   Best Streak: X | Guess Distribution: 1️⃣X 2️⃣X 3️⃣X 4️⃣X 5️⃣X 6️⃣X
```
