---
name: play
description: Launch Claude Arcade — terminal games and brain training in a split pane
---

# Play Claude Arcade

Launch the arcade game menu in a Windows Terminal split pane.

When this skill is invoked, run the launch script:

```bash
hooks/launch-arcade.cmd
```

If that fails (e.g., not in the plugin directory), run it directly:

```bash
wt -w 0 sp -s 0.35 node "<plugin-dir>/index.js"
```

Where `<plugin-dir>` is the directory containing this skill's plugin.

Tell the user: "Arcade launched! Check the split pane to your right. Games: Snake, Mental Math, and CodeWord."

If the user passes a game name as an argument (e.g., `/play snake`), mention which game they should pick from the menu.
