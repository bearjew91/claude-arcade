---
name: play
description: Launch Dev Hangman — guess tech terms in a split pane while Claude works
---

# Play Dev Hangman

Launch Dev Hangman in a Windows Terminal split pane.

Run:

```bash
wt -w 0 sp -s 0.5 node "<plugin-dir>/index.js"
```

Where `<plugin-dir>` is the directory containing this skill's plugin.

Tell the user: "Dev Hangman launched! Check the split pane — guess tech terms while I work."
