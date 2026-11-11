// Card renderers. Each takes (data, theme) and returns an SVG string.

import { THEMES, card, compact, delay, escape, grouped } from "./svg.mjs";

const WIDTH = 495;
const HOURS = (ms) => Math.round(ms / 3_600_000);
const sinceLabel = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Big-number grid of agent activity.
export function agentOps({ agent }, theme) {
  const t = THEMES[theme];
  const tiles = [
    ["Tokens processed", compact(agent.tokens.total)],
    ["Sessions", grouped(agent.sessions)],
    ["Tool calls", compact(agent.toolCalls)],
    ["Agent hours", grouped(HOURS(agent.agentMs))],
    ["Commits", grouped(agent.gitCommits)],
    ["PRs opened", grouped(agent.prsOpened)],
    ["Subagents", grouped(agent.subagents)],
    ["Tokens written", compact(agent.tokens.output)],
  ];
  const columns = 4;
  const body = tiles
    .map(([label, value], i) => {
      const x = 20 + (i % columns) * 118;
      const y = 72 + Math.floor(i / columns) * 58;
      return `<g class="fade" style="${delay(i)}"><text x="${x}" y="${y}" class="value">${value}</text><text x="${x}" y="${y + 18}" class="label">${label}</text></g>`;
    })
    .join("\n");
  return card({
    width: WIDTH,
    height: 166,
    theme,
    title: "Agent activity",
    body: `<text x="20" y="28" class="heading">AGENT ACTIVITY</text>
<text x="${WIDTH - 20}" y="28" class="label" text-anchor="end">since ${sinceLabel(agent.firstSessionAt)} · ${agent.activeDays} days</text>
<rect x="20" y="38" width="0" height="2" rx="1" fill="${t.accent}"><animate attributeName="width" from="0" to="${WIDTH - 40}" dur="0.9s" fill="freeze"/></rect>
${body}`,
  });
}

// Horizontal bars, used for models and tools.
function barList({ title, rows, theme, note }) {
  const t = THEMES[theme];
  const max = Math.max(...rows.map((r) => r.value));
  const barX = 170;
  const barWidth = WIDTH - barX - 70;
  const body = rows
    .map((row, i) => {
      const y = 56 + i * 26;
      const width = Math.max(2, (row.value / max) * barWidth);
      return `<g class="fade" style="${delay(i)}">
<text x="20" y="${y + 9}" font-size="12">${escape(row.label)}</text>
<rect x="${barX}" y="${y}" width="${barWidth}" height="10" rx="5" fill="${t.track}"/>
<rect x="${barX}" y="${y}" width="0" height="10" rx="5" fill="${t.accent}"><animate attributeName="width" from="0" to="${width.toFixed(1)}" begin="${(0.2 + i * 0.08).toFixed(2)}s" dur="0.8s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1"/></rect>
<text x="${WIDTH - 20}" y="${y + 9}" font-size="12" class="muted" text-anchor="end">${row.display}</text>
</g>`;
    })
    .join("\n");
  return card({
    width: WIDTH,
    height: 70 + rows.length * 26,
    theme,
    title,
    body: `<text x="20" y="28" class="heading">${escape(title.toUpperCase())}</text>
${note ? `<text x="${WIDTH - 20}" y="28" class="label" text-anchor="end">${escape(note)}</text>` : ""}
${body}`,
  });
}

const prettyModel = (id) =>
  id
    .replace(/^claude-/, "Claude ")
    .replace(/-free$/, "")
    .replace(/-(\d+)-(\d+)$/, " $1.$2")
    .replace(/-(\d+)$/, " $1")
    .replace(/-/g, " ")
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());

export function models({ agent }, theme) {
  const entries = Object.entries(agent.modelTurns);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const top = entries.slice(0, 5);
  const rest = entries.slice(5).reduce((sum, [, n]) => sum + n, 0);
  const rows = top.map(([id, n]) => ({ label: prettyModel(id), value: n }));
  if (rest) rows.push({ label: `${entries.length - 5} other models`, value: rest });
  for (const row of rows) row.display = `${((row.value / total) * 100).toFixed(1)}%`;
  return barList({ title: "Models", rows, theme, note: `${compact(total)} agent turns` });
}

const prettyTool = (name) => name.replace(/^mcp__[^_]+(?:-[^_]+)*__/, "").replace(/_/g, " ");

export function tools({ agent }, theme) {
  const rows = Object.entries(agent.tools)
    .slice(0, 6)
    .map(([name, n]) => ({ label: prettyTool(name), value: n, display: compact(n) }));
  return barList({ title: "Most used agent tools", rows, theme, note: `${compact(agent.toolCalls)} calls` });
}

// Weekday x hour grid of agent turns.
export function heatmap({ agent }, theme) {
  const t = THEMES[theme];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(...agent.heatmap.flat());
  const size = 15;
  const gap = 3;
  const left = 50;
  const top = 48;
  const cells = agent.heatmap
    .flatMap((row, d) =>
      row.map((n, h) => {
        const opacity = n === 0 ? 0.08 : 0.18 + 0.82 * Math.sqrt(n / max);
        return `<rect x="${left + h * (size + gap)}" y="${top + d * (size + gap)}" width="${size}" height="${size}" rx="3" fill="${t.cell}" fill-opacity="${opacity.toFixed(2)}" class="fade" style="${delay(h, 0.03)}"/>`;
      }),
    )
    .join("\n");
  const dayLabels = days.map((d, i) => `<text x="20" y="${top + i * (size + gap) + 12}" class="label">${d}</text>`).join("");
  const hourLabels = [0, 6, 12, 18, 23]
    .map((h) => `<text x="${left + h * (size + gap) + size / 2}" y="${top + 7 * (size + gap) + 12}" class="label" text-anchor="middle">${String(h).padStart(2, "0")}</text>`)
    .join("");
  return card({
    width: WIDTH,
    height: top + 7 * (size + gap) + 26,
    theme,
    title: "When my agents work",
    body: `<text x="20" y="28" class="heading">WHEN MY AGENTS WORK</text>
<text x="${WIDTH - 20}" y="28" class="label" text-anchor="end">agent turns by hour, ${escape(agent.timeZone.split("/")[1])}</text>
${dayLabels}${hourLabels}
${cells}`,
  });
}

// Real-world reach from GitHub: downloads, stars, upstream merges.
export function reach({ github }, theme) {
  const t = THEMES[theme];
  const tiles = [
    ["Downloads", compact(github.releaseDownloads)],
    ["Stars earned", grouped(github.stars)],
    ["Upstream merges", grouped(github.externalMergedPrs)],
    ["Upstream repo ★", compact(github.externalRepoStars)],
  ];
  const body = tiles
    .map(([label, value], i) => {
      const x = 20 + i * 118;
      return `<g class="fade" style="${delay(i)}"><text x="${x}" y="68" class="value">${value}</text><text x="${x}" y="86" class="label">${label}</text></g>`;
    })
    .join("\n");
  const upstream = github.topExternalRepos
    .slice(0, 3)
    .map((r) => `${r.repo.split("/")[1]} ★${compact(r.stars)}`)
    .join("  ·  ");
  return card({
    width: WIDTH,
    height: 130,
    theme,
    title: "Reach",
    body: `<text x="20" y="28" class="heading">REACH</text>
<rect x="20" y="38" width="0" height="2" rx="1" fill="${t.accent}"><animate attributeName="width" from="0" to="${WIDTH - 40}" dur="0.9s" fill="freeze"/></rect>
${body}
<text x="20" y="114" class="label fade" style="${delay(5)}">Merged into: ${escape(upstream)}</text>`,
  });
}

// Terminal that types out a summary, line by line.
export function terminal({ agent, github }, theme) {
  const t = THEMES[theme];
  const lines = [
    ["$ agent stats --since " + sinceLabel(agent.firstSessionAt).toLowerCase().replace(" ", "-"), true],
    [`${grouped(agent.sessions)} sessions · ${compact(agent.toolCalls)} tool calls · ${compact(agent.tokens.total)} tokens`],
    [`${grouped(agent.gitCommits)} commits · ${grouped(agent.prsOpened)} PRs opened · ${grouped(agent.subagents)} subagents`],
    ["$ gh reach", true],
    [`${compact(github.releaseDownloads)} downloads · ${grouped(github.stars)} stars · ${github.externalMergedPrs} PRs merged upstream`],
  ];
  const lineHeight = 22;
  // Generous per-character width so wider monospace fonts are never clipped.
  const charWidth = 8;
  const css = lines
    .map(([text], i) => {
      const width = Math.ceil(text.length * charWidth) + 12;
      const start = i * 1.1;
      return `#l${i} { animation: type${i} 0.9s steps(${text.length}, end) ${start.toFixed(1)}s forwards; }
@keyframes type${i} { from { width: 0; } to { width: ${width}px; } }`;
    })
    .join("\n");
  const body = lines
    .map(([text, prompt], i) => {
      const y = 62 + i * lineHeight;
      return `<clipPath id="c${i}"><rect id="l${i}" x="18" y="${y - 14}" width="0" height="20"/></clipPath>
<text x="20" y="${y}" font-size="12.5" clip-path="url(#c${i})" ${prompt ? `class="accent"` : ""} style="font-family: ${MONO}">${escape(text)}</text>`;
    })
    .join("\n");
  const cursorY = 62 + lines.length * lineHeight - 12;
  return card({
    width: WIDTH,
    height: 62 + lines.length * lineHeight + 8,
    theme,
    title: "Agent terminal",
    css: `${css}
.cursor { animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { ${lines.map((_, i) => `#l${i}`).join(", ")} { width: 495px; } }`,
    body: `<circle cx="24" cy="24" r="5" fill="#ff5f57"/><circle cx="40" cy="24" r="5" fill="#febc2e"/><circle cx="56" cy="24" r="5" fill="#28c840"/>
<text x="${WIDTH / 2}" y="28" class="label" text-anchor="middle">mario@vps: ~</text>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${62 + lines.length * lineHeight + 7}" rx="10" stroke="${t.track}"/>
${body}
<rect class="cursor" x="20" y="${cursorY}" width="8" height="14" fill="${t.accent}"/>`,
  });
}
