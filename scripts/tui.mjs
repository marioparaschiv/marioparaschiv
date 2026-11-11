// One terminal-style (TUI) card: agent stats, GitHub reach, languages, models and the activity heatmap.

import { card, compact, escape, grouped } from "./svg.mjs";

const W = 860;
const PAD = 16;
const GAP = 12;
const COL = (W - PAD * 2 - GAP) / 2;
const ROW = 22;
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const PALETTE = {
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e", accent: "#4F8CC9", ok: "#3fb950", track: "#21262d", bar: "#161b22", cyan: "#56d4dd", purple: "#bc8cff", yellow: "#d29922" },
  light: { bg: "#ffffff", border: "#d1d9e0", text: "#1f2328", muted: "#59636e", accent: "#2f6fb0", ok: "#1a7f37", track: "#eaeef2", bar: "#f6f8fa", cyan: "#1b7c83", purple: "#8250df", yellow: "#9a6700" },
};

const CHAR = 7.8;
// Square heatmap cells sized to fill the full-width pane (56px day labels, 16px padding, 4px gaps).
const CELL = (W - PAD * 2 - 56 - 16 - 23 * 4) / 24;
const BRANCH_ICON =
  "M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z";

// The first line of my starship prompt: `stats on <branch icon> main [took Ns] [at <date>]`.
function starshipLine({ y, p, took, time }) {
  const dir = "stats";
  const iconX = PAD + (dir.length + 4) * CHAR;
  const branchX = iconX + 18;
  return `<text x="${PAD}" y="${y}"><tspan fill="${p.cyan}" font-weight="700">${dir}</tspan> on</text>
<path d="${BRANCH_ICON}" transform="translate(${iconX} ${y - 11}) scale(0.75)" fill="${p.purple}"/>
<text x="${branchX}" y="${y}"><tspan fill="${p.purple}" font-weight="700">main</tspan>${took ? ` took <tspan fill="${p.yellow}" font-weight="700">${took}</tspan>` : ""}${time ? ` at <tspan fill="${p.yellow}" font-weight="700">${escape(time)}</tspan>` : ""}</text>`;
}

// The second line: a bold green arrow.
const arrow = (y, p) => `<text x="${PAD}" y="${y}" fill="${p.ok}" font-weight="700">➜</text>`;

const since = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const at = (s) => `animation-delay: ${s.toFixed(2)}s`;

// Bordered pane with its title cut into the top border, TUI style.
function pane({ x, y, w, h, title, note, p, start, children }) {
  const titleWidth = title.length * 8.4 + 16;
  const noteWidth = note ? note.length * 7.3 + 14 : 0;
  return `<g class="fade" style="${at(start)}">
<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="6" stroke="${p.border}"/>
<rect x="${x + 12}" y="${y - 2}" width="${titleWidth}" height="5" fill="${p.bg}"/>
<text x="${x + 20}" y="${y + 4}" class="pane-title">${escape(title)}</text>
${note ? `<rect x="${x + w - 12 - noteWidth}" y="${y - 2}" width="${noteWidth}" height="5" fill="${p.bg}"/><text x="${x + w - 19}" y="${y + 4}" class="small muted" text-anchor="end">${escape(note)}</text>` : ""}
${children}
</g>`;
}

// key ........ value  rows.
function rows({ x, y, w, items, start }) {
  return items
    .map(([key, value, suffix], i) => {
      const ty = y + 28 + i * ROW;
      return `<g class="fade" style="${at(start + i * 0.05)}">
<text x="${x + 16}" y="${ty}" class="muted">${escape(key)}</text>
<line x1="${x + 16 + key.length * 7.8 + 8}" y1="${ty - 4}" x2="${x + w - 16 - (value.length + (suffix ? suffix.length + 1 : 0)) * 7.8 - 8}" y2="${ty - 4}" class="leader"/>
<text x="${x + w - 16}" y="${ty}" text-anchor="end"><tspan class="val">${escape(value)}</tspan>${suffix ? `<tspan class="ok"> ${escape(suffix)}</tspan>` : ""}</text>
</g>`;
    })
    .join("\n");
}

// Name, animated gauge, percentage.
function gauges({ x, y, w, items, start, p, labelWidth = 150 }) {
  const barX = x + labelWidth;
  const barW = w - labelWidth - 70;
  return items
    .map(({ name, share, color }, i) => {
      const ty = y + 28 + i * ROW;
      const fill = Math.max(3, share * barW);
      const begin = (start + 0.2 + i * 0.07).toFixed(2);
      return `<g class="fade" style="${at(start + i * 0.05)}">
<circle cx="${x + 20}" cy="${ty - 4}" r="4" fill="${color ?? p.accent}"/>
<text x="${x + 32}" y="${ty}">${escape(name)}</text>
<rect x="${barX}" y="${ty - 10}" width="${barW}" height="8" rx="2" fill="${p.track}"/>
<rect x="${barX}" y="${ty - 10}" width="0" height="8" rx="2" fill="${color ?? p.accent}"><animate attributeName="width" from="0" to="${fill.toFixed(1)}" begin="${begin}s" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1"/></rect>
<text x="${x + w - 16}" y="${ty}" text-anchor="end" class="muted">${(share * 100).toFixed(1)}%</text>
</g>`;
    })
    .join("\n");
}

function heatmap({ x, y, w, grid, start, p }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const left = x + 56;
  const cellW = CELL;
  const cellH = CELL;
  const max = Math.max(...grid.flat());
  const cells = grid
    .flatMap((row, d) =>
      row.map((n, h) => {
        const opacity = n === 0 ? 0.08 : 0.18 + 0.82 * Math.sqrt(n / max);
        return `<rect x="${(left + h * (cellW + 4)).toFixed(1)}" y="${(y + 18 + d * (cellH + 4)).toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" rx="4" fill="${p.accent}" fill-opacity="${opacity.toFixed(2)}" class="fade" style="${at(start + 0.15 + h * 0.025)}"/>`;
      }),
    )
    .join("\n");
  const dayLabels = days.map((d, i) => `<text x="${x + 16}" y="${(y + 18 + cellH / 2 + 4 + i * (cellH + 4)).toFixed(1)}" class="small muted">${d}</text>`).join("");
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21, 23]
    .map((h) => `<text x="${(left + h * (cellW + 4) + cellW / 2).toFixed(1)}" y="${(y + 18 + 7 * (cellH + 4) + 12).toFixed(1)}" class="small muted" text-anchor="middle">${String(h).padStart(2, "0")}</text>`)
    .join("");
  return `${dayLabels}${hourLabels}\n${cells}`;
}

const prettyModel = (id) =>
  id
    .replace(/^claude-/, "")
    .replace(/-free$/, "")
    .replace(/-(\d+)-(\d+)$/, " $1.$2")
    .replace(/-/g, " ");

export function tui({ agent, github, t3 }, theme) {
  const p = PALETTE[theme];
  const user = "marioparaschiv";
  const command = "stats --agents --github";
  const commandX = PAD + 2 * CHAR;
  // Starship's time module, shown as when these stats were generated.
  const updated = new Date(agent.generatedAt).toLocaleString("en-GB", {
    timeZone: agent.timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const top = 106;

  const agentItems = [
    ["tokens", compact(agent.tokens.total)],
    ["sessions", grouped(agent.sessions)],
    ["runs", grouped(t3.runs), `${(t3.runCompletionRate * 100).toFixed(0)}% done`],
    ["most at once", grouped(t3.peakParallelRuns)],
    ["subagents", grouped(t3.subagents)],
    ["hours working", grouped(Math.round(agent.agentMs / 3_600_000))],
    ["PRs shipped", grouped(t3.prsMerged)],
    ["lines shipped", `+${compact(t3.linesAdded)}`],
  ];
  const mergedShare = github.pullRequestsMerged / github.pullRequests;
  const githubItems = [
    ["stars", grouped(github.stars)],
    ["PRs opened", grouped(github.pullRequests)],
    ["PRs merged", grouped(github.pullRequestsMerged), `${(mergedShare * 100).toFixed(0)}%`],
    ["contributed to, past year", `${grouped(github.contributedTo)} repos`],
    ["downloads", compact(github.releaseDownloads)],
    ["merged upstream", `${github.externalMergedPrs} PRs`],
    ["upstream stars", compact(github.externalRepoStars)],
    ["biggest upstream", github.topExternalRepos[0].repo],
  ];
  const row1 = 28 + agentItems.length * ROW;

  const languages = github.languages;
  const modelEntries = Object.entries(agent.modelTurns);
  const modelTotal = modelEntries.reduce((sum, [, n]) => sum + n, 0);
  const models = modelEntries.slice(0, 5).map(([id, n]) => ({ name: prettyModel(id), share: n / modelTotal }));
  const otherModels = modelEntries.slice(5).reduce((sum, [, n]) => sum + n, 0);
  models.push({ name: `${modelEntries.length - 5} others`, share: otherModels / modelTotal });
  const row2 = 28 + Math.max(languages.length, models.length) * ROW;

  const heatTop = top + row1 + GAP + row2 + GAP;
  const heatH = 18 + 7 * (CELL + 4) + 26;
  const promptY = heatTop + heatH + 30;
  const H = promptY + 20 + 22;

  const typeChars = command.length;
  const css = `
  text { font-family: ${MONO}; font-size: 13px; }
  .small { font-size: 11.5px; }
  .pane-title { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; fill: ${p.accent}; }
  .val { fill: ${p.text}; font-weight: 600; }
  .ok { fill: ${p.ok}; }
  .leader { stroke: ${p.border}; stroke-dasharray: 1 4; stroke-linecap: round; }
  #typed { animation: type 0.8s steps(${typeChars}, end) 0.2s forwards; }
  @keyframes type { from { width: 0; } to { width: ${typeChars * 8 + 10}px; } }
  .cursor { animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { #typed { width: ${typeChars * 8 + 10}px; } }`;

  const body = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${p.bg}" stroke="${p.border}"/>
<path d="M1 36 V10 A9 9 0 0 1 10 1 H${W - 10} A9 9 0 0 1 ${W - 1} 10 V36 Z" fill="${p.bar}"/>
<path d="M0.5 36 H${W - 0.5}" stroke="${p.border}"/>
<circle cx="22" cy="18" r="6" fill="#ff5f57"/><circle cx="42" cy="18" r="6" fill="#febc2e"/><circle cx="62" cy="18" r="6" fill="#28c840"/>
<text x="${W / 2}" y="22" class="small muted" text-anchor="middle">dev@vps: ~/stats</text>
${starshipLine({ y: 62, p, time: updated })}
${arrow(82, p)}
<clipPath id="typeclip"><rect id="typed" x="${commandX}" y="68" width="0" height="20"/></clipPath>
<text x="${commandX}" y="82" clip-path="url(#typeclip)">${command}</text>
${pane({ x: PAD, y: top, w: COL, h: row1, title: "AGENTS", note: `since ${since(agent.firstSessionAt)}`, p, start: 1.0, children: rows({ x: PAD, y: top, w: COL, items: agentItems, start: 1.1 }) })}
${pane({ x: PAD + COL + GAP, y: top, w: COL, h: row1, title: "GITHUB", note: `@${user}`, p, start: 1.2, children: rows({ x: PAD + COL + GAP, y: top, w: COL, items: githubItems, start: 1.3 }) })}
${pane({ x: PAD, y: top + row1 + GAP, w: COL, h: row2, title: "LANGUAGES", note: "by code size", p, start: 1.5, children: gauges({ x: PAD, y: top + row1 + GAP, w: COL, items: languages, start: 1.6, p }) })}
${pane({ x: PAD + COL + GAP, y: top + row1 + GAP, w: COL, h: row2, title: "MODELS", note: `${compact(modelTotal)} turns`, p, start: 1.7, children: gauges({ x: PAD + COL + GAP, y: top + row1 + GAP, w: COL, items: models, start: 1.8, p, labelWidth: 200 }) })}
${pane({ x: PAD, y: heatTop, w: W - PAD * 2, h: heatH, title: "ACTIVITY", note: "hour by hour, UK time", p, start: 2.0, children: heatmap({ x: PAD, y: heatTop, w: W - PAD * 2, grid: agent.heatmap, start: 2.0, p }) })}
<g class="fade" style="${at(2.8)}">
${starshipLine({ y: promptY, p, took: "2s" })}
${arrow(promptY + 20, p)}
<rect class="cursor" x="${commandX}" y="${promptY + 8}" width="8" height="15" fill="${p.text}"/>
</g>`;

  return card({ width: W, height: H, theme, title: "Agent and GitHub stats", css, body });
}
