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
<picture><source srcset="cards/tui-dark.svg?v=c57bda9f" media="(prefers-color-scheme: dark)"><img src="cards/tui-light.svg?v=4d7c2720" alt="tui"></picture>
</p>

<p align="center">
<picture><source srcset="cards/t3-dark.svg?v=18c5bf1b" media="(prefers-color-scheme: dark)"><img src="cards/t3-light.svg?v=b01bcd8f" alt="t3"></picture>
</p>

<p align="center">
<picture><source srcset="cards/agent-ops-dark.svg?v=96465cb9" media="(prefers-color-scheme: dark)"><img src="cards/agent-ops-light.svg?v=df93ceb2" alt="agent-ops"></picture>
</p>

<p align="center">
<picture><source srcset="cards/models-dark.svg?v=17fe50d3" media="(prefers-color-scheme: dark)"><img src="cards/models-light.svg?v=c42e0321" alt="models"></picture>
</p>

<p align="center">
<picture><source srcset="cards/tools-dark.svg?v=f644966c" media="(prefers-color-scheme: dark)"><img src="cards/tools-light.svg?v=6cc0ed17" alt="tools"></picture>
</p>

<p align="center">
<picture><source srcset="cards/heatmap-dark.svg?v=eca5004b" media="(prefers-color-scheme: dark)"><img src="cards/heatmap-light.svg?v=e82bbd2b" alt="heatmap"></picture>
</p>

<p align="center">
<picture><source srcset="cards/reach-dark.svg?v=b0df26db" media="(prefers-color-scheme: dark)"><img src="cards/reach-light.svg?v=5e0ba9cf" alt="reach"></picture>
</p>

<p align="center">
<picture><source srcset="cards/terminal-dark.svg?v=0198f35b" media="(prefers-color-scheme: dark)"><img src="cards/terminal-light.svg?v=2374ae64" alt="terminal"></picture>
</p>
