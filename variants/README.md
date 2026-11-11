# README variants

Previews only. The real profile README is unchanged. Toggle GitHub's light/dark theme to see both card themes.

Cards are a static snapshot. Regenerate on the VPS with:

```sh
node scripts/agent-stats.mjs > data/agent-stats.json
node scripts/t3-stats.mjs > data/t3-stats.json
node scripts/github-stats.mjs > data/github-stats.json
node scripts/render.mjs
```

- [D. TUI](d-tui.md): One terminal dashboard: agent stats, GitHub reach, languages, models and the activity heatmap.
- [A. Agent-first](a-agent-first.md): Replaces the classic GitHub cards with agent activity, model mix and a 24/7 heatmap.
- [B. Terminal](b-terminal.md): Minimal: one animated terminal that types out agent and reach stats, then the reach card.
- [C. Full dashboard](c-dashboard.md): Keeps your current cards, adds reach and agent activity, with the details tucked into expandable sections.

## All cards

<p align="center">
<picture><source srcset="cards/tui-dark.svg?v=1dde6fec" media="(prefers-color-scheme: dark)"><img src="cards/tui-light.svg?v=54a223c1" alt="tui"></picture>
</p>

<p align="center">
<picture><source srcset="cards/t3-dark.svg?v=7bd8f5c5" media="(prefers-color-scheme: dark)"><img src="cards/t3-light.svg?v=1f4c7cb6" alt="t3"></picture>
</p>

<p align="center">
<picture><source srcset="cards/agent-ops-dark.svg?v=9b4e6726" media="(prefers-color-scheme: dark)"><img src="cards/agent-ops-light.svg?v=89665728" alt="agent-ops"></picture>
</p>

<p align="center">
<picture><source srcset="cards/models-dark.svg?v=c0ff3f0e" media="(prefers-color-scheme: dark)"><img src="cards/models-light.svg?v=2761fef0" alt="models"></picture>
</p>

<p align="center">
<picture><source srcset="cards/tools-dark.svg?v=d6282069" media="(prefers-color-scheme: dark)"><img src="cards/tools-light.svg?v=8fd4b603" alt="tools"></picture>
</p>

<p align="center">
<picture><source srcset="cards/heatmap-dark.svg?v=5407c9d6" media="(prefers-color-scheme: dark)"><img src="cards/heatmap-light.svg?v=a082d20e" alt="heatmap"></picture>
</p>

<p align="center">
<picture><source srcset="cards/reach-dark.svg?v=96ff5e56" media="(prefers-color-scheme: dark)"><img src="cards/reach-light.svg?v=465e048b" alt="reach"></picture>
</p>

<p align="center">
<picture><source srcset="cards/terminal-dark.svg?v=b568f9ea" media="(prefers-color-scheme: dark)"><img src="cards/terminal-light.svg?v=c6f74056" alt="terminal"></picture>
</p>
