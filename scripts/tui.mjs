// One terminal-style (TUI) card: agent stats, GitHub reach, languages, models and the contribution calendar.

import { readFileSync } from "node:fs";
import { card, compact, escape, grouped } from "./svg.mjs";

// JetBrains Mono Nerd Font (Mono), subset to ASCII plus the prompt glyphs and embedded,
// so the card renders with the same metrics and icons everywhere.
const font = (weight) => readFileSync(new URL(`../fonts/jbmono-nf-${weight}.woff2`, import.meta.url)).toString("base64");
const FONT_FACES = `
  @font-face { font-family: "JBM NF"; font-weight: 400; src: url(data:font/woff2;base64,${font("Regular")}) format("woff2"); }
  @font-face { font-family: "JBM NF"; font-weight: 700; src: url(data:font/woff2;base64,${font("Bold")}) format("woff2"); }`;

const W = 860;
const PAD = 16;
const GAP = 12;
const COL = (W - PAD * 2 - GAP) / 2;
const ROW = 22;
const MONO = "'JBM NF', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const PALETTE = {
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e", accent: "#4F8CC9", ok: "#3fb950", track: "#21262d", bar: "#161b22", cyan: "#56d4dd", purple: "#bc8cff", yellow: "#d29922" },
  light: { bg: "#ffffff", border: "#d1d9e0", text: "#1f2328", muted: "#59636e", accent: "#2f6fb0", ok: "#1a7f37", track: "#eaeef2", bar: "#f6f8fa", cyan: "#1b7c83", purple: "#8250df", yellow: "#9a6700" },
};

// Every glyph in the embedded font is 600/1000 em wide; 13px text gives a 7.8px terminal cell.
const CHAR = 7.8;
const SMALL_CHAR = 11.5 * 0.6;

// Line 1 of my starship prompt, same modules and styles: `stats on  main [took 2s] [at <time>]`.
function starshipLine({ y, p, took, time }) {
  const bold = (color, text) => `<tspan fill="${color}" font-weight="700">${escape(text)}</tspan>`;
  return `<text x="${PAD}" y="${y}" xml:space="preserve">${bold(p.cyan, "stats")} on ${bold(p.purple, "\ue0a0 main")}${took ? ` took ${bold(p.yellow, took)}` : ""}${time ? ` at ${bold(p.yellow, time)}` : ""}</text>`;
}

// Line 2: starship's success symbol, a bold green arrow followed by a space.
const arrow = (y, p) => `<text x="${PAD}" y="${y}"><tspan fill="${p.ok}" font-weight="700">➜</tspan></text>`;
// The command starts two cells after the arrow, so it doesn't crowd the glyph.
const COMMAND_X = PAD + 3 * CHAR;

const since = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const at = (s) => `animation-delay: ${s.toFixed(2)}s`;

// Bordered pane with its title cut into the top border, TUI style.
function pane({ x, y, w, h, title, note, p, start, children }) {
  const titleWidth = title.length * (12 * 0.6 + 0.72) + 16;
  const noteWidth = note ? note.length * SMALL_CHAR + 14 : 0;
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
<line x1="${x + 16 + key.length * CHAR + 8}" y1="${ty - 4}" x2="${x + w - 16 - (value.length + (suffix ? suffix.length + 1 : 0)) * CHAR - 8}" y2="${ty - 4}" class="leader"/>
<text x="${x + w - 16}" y="${ty}" text-anchor="end"><tspan class="val">${escape(value)}</tspan>${suffix ? `<tspan class="ok"> ${escape(suffix)}</tspan>` : ""}</text>
</g>`;
    })
    .join("\n");
}

// Name, animated gauge, percentage.
function gauges({ x, y, w, items, start, p, labelWidth = 150, starFirst = false }) {
  const barX = x + labelWidth;
  const barW = w - labelWidth - 70;
  return items
    .map(({ name, share, color }, i) => {
      const ty = y + 28 + i * ROW;
      const fill = Math.max(3, share * barW);
      const begin = (start + 0.2 + i * 0.07).toFixed(2);
      return `<g class="fade" style="${at(start + i * 0.05)}">
<circle cx="${x + 20}" cy="${ty - 4}" r="4" fill="${color ?? p.accent}"/>
<text x="${x + 32}" y="${ty}" xml:space="preserve">${escape(name)}${starFirst && i === 0 ? ` <tspan fill="${p.yellow}">\uf005</tspan>` : ""}</text>
<rect x="${barX}" y="${ty - 10}" width="${barW}" height="8" rx="2" fill="${p.track}"/>
<rect x="${barX}" y="${ty - 10}" width="0" height="8" rx="2" fill="${color ?? p.accent}"><animate attributeName="width" from="0" to="${fill.toFixed(1)}" begin="${begin}s" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1"/></rect>
<text x="${x + w - 16}" y="${ty}" text-anchor="end" class="muted">${(share * 100).toFixed(1)}%</text>
</g>`;
    })
    .join("\n");
}

// GitHub-style contribution calendar: one small square per day, one column per week.
const CELL = 11;
const STEP = 14;
const CALENDAR_H = 30 + 7 * STEP + 22;

function calendar({ x, y, w, weeks, start, p }) {
  const left = x + 46;
  const top = y + 30;
  // Four intensity levels from quartiles of the non-zero days, like GitHub.
  const counts = weeks
    .flat()
    .map(([, n]) => n)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const quartile = (q) => counts[Math.floor(q * (counts.length - 1))];
  const cuts = [quartile(0.25), quartile(0.5), quartile(0.75)];
  const OPACITY = [0.28, 0.5, 0.75, 1];
  const swatch = (cx, cy, level, extra = "") =>
    level < 0
      ? `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="2" fill="${p.track}" ${extra}/>`
      : `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="2" fill="${p.accent}" fill-opacity="${OPACITY[level]}" ${extra}/>`;
  const levelOf = (n) => (n === 0 ? -1 : cuts.filter((c) => n > c).length);

  const cells = weeks
    .flatMap((week, wi) =>
      week.map(([date, n]) => {
        const day = new Date(`${date}T00:00:00Z`).getUTCDay();
        return swatch(left + wi * STEP, top + day * STEP, levelOf(n), `class="fade" style="${at(start + 0.15 + wi * 0.015)}"`);
      }),
    )
    .join("\n");

  const months = [];
  weeks.forEach((week, wi) => {
    const first = week.find(([date]) => date.endsWith("-01") || wi === 0);
    if (first && wi < weeks.length - 2) {
      const label = new Date(`${first[0]}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      if (wi > 0 || week[0][0].slice(8) <= "07") months.push(`<text x="${left + wi * STEP}" y="${top - 8}" class="small muted">${label}</text>`);
    }
  });
  const dayLabels = [
    [1, "Mon"],
    [3, "Wed"],
    [5, "Fri"],
  ]
    .map(([d, label]) => `<text x="${x + 12}" y="${top + d * STEP + 9}" class="small muted">${label}</text>`)
    .join("");

  const legendY = top + 7 * STEP + 6;
  const legendRight = x + w - 16;
  const swatches = [-1, 0, 1, 2, 3].map((level, i) => swatch(legendRight - 34 - (4 - i) * STEP - CELL, legendY, level)).join("");
  const legend = `<text x="${legendRight - 34 - 4 * STEP - CELL - 8}" y="${legendY + 9}" class="small muted" text-anchor="end">less</text>${swatches}<text x="${legendRight}" y="${legendY + 9}" class="small muted" text-anchor="end">more</text>`;
  return `${months.join("")}${dayLabels}\n${cells}\n${legend}`;
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
  const heatH = CALENDAR_H;
  const promptY = heatTop + heatH + 30;
  const H = promptY + 20 + 22;

  const typeChars = command.length;
  const css = `${FONT_FACES}
  text { font-family: ${MONO}; font-size: 13px; }
  .small { font-size: 11.5px; }
  .pane-title { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; fill: ${p.accent}; }
  .val { fill: ${p.text}; font-weight: 600; }
  .ok { fill: ${p.ok}; }
  .leader { stroke: ${p.border}; stroke-dasharray: 1 4; stroke-linecap: round; }
  #typed { animation: type 0.8s steps(${typeChars}, end) 0.2s forwards; }
  @keyframes type { from { width: 0; } to { width: ${typeChars * CHAR + 4}px; } }
  .cursor { animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { #typed { width: ${typeChars * CHAR + 4}px; } }`;

  const body = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${p.bg}" stroke="${p.border}"/>
<path d="M1 36 V10 A9 9 0 0 1 10 1 H${W - 10} A9 9 0 0 1 ${W - 1} 10 V36 Z" fill="${p.bar}"/>
<path d="M0.5 36 H${W - 0.5}" stroke="${p.border}"/>
<circle cx="22" cy="18" r="6" fill="#ff5f57"/><circle cx="42" cy="18" r="6" fill="#febc2e"/><circle cx="62" cy="18" r="6" fill="#28c840"/>
<text x="${W / 2}" y="22" class="small muted" text-anchor="middle">dev@vps: ~/stats</text>
${starshipLine({ y: 62, p, time: updated })}
${arrow(82, p)}
<clipPath id="typeclip"><rect id="typed" x="${COMMAND_X}" y="68" width="0" height="20"/></clipPath>
<text x="${COMMAND_X}" y="82" clip-path="url(#typeclip)">${command}</text>
${pane({ x: PAD, y: top, w: COL, h: row1, title: "AGENTS", note: `since ${since(agent.firstSessionAt)}`, p, start: 1.0, children: rows({ x: PAD, y: top, w: COL, items: agentItems, start: 1.1 }) })}
${pane({ x: PAD + COL + GAP, y: top, w: COL, h: row1, title: "GITHUB", note: `@${user}`, p, start: 1.2, children: rows({ x: PAD + COL + GAP, y: top, w: COL, items: githubItems, start: 1.3 }) })}
${pane({ x: PAD, y: top + row1 + GAP, w: COL, h: row2, title: "LANGUAGES", note: "by code size", p, start: 1.5, children: gauges({ x: PAD, y: top + row1 + GAP, w: COL, items: languages, start: 1.6, p }) })}
${pane({ x: PAD + COL + GAP, y: top + row1 + GAP, w: COL, h: row2, title: "MODELS", note: `${compact(modelTotal)} turns`, p, start: 1.7, children: gauges({ x: PAD + COL + GAP, y: top + row1 + GAP, w: COL, items: models, start: 1.8, p, labelWidth: 200, starFirst: true }) })}
${pane({ x: PAD, y: heatTop, w: W - PAD * 2, h: heatH, title: "ACTIVITY", note: `${grouped(github.contributions)} contributions in the past year`, p, start: 2.0, children: calendar({ x: PAD, y: heatTop, w: W - PAD * 2, weeks: github.calendar, start: 2.0, p }) })}
<g class="fade" style="${at(2.8)}">
${starshipLine({ y: promptY, p, took: "2s" })}
${arrow(promptY + 20, p)}
<rect class="cursor" x="${COMMAND_X}" y="${promptY + 6}" width="2" height="17" fill="${p.text}"/>
</g>`;

  return card({ width: W, height: H, theme, title: "Agent and GitHub stats", css, body });
}
