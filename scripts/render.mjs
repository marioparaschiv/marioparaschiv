// Renders every card in both themes into variants/.
// Usage: node scripts/render.mjs

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { agentOps, heatmap, models, reach, t3, terminal, tools } from "./cards.mjs";
import { tui } from "./tui.mjs";

const read = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const data = {
  agent: await read("data/agent-stats.json"),
  github: await read("data/github-stats.json"),
  t3: await read("data/t3-stats.json"),
};

const CARDS = { tui, t3, "agent-ops": agentOps, models, tools, heatmap, reach, terminal };

const outDir = new URL("../variants/cards/", import.meta.url);
await mkdir(outDir, { recursive: true });
// Content hash per file, appended to image URLs so browsers and GitHub's cache fetch new versions.
const versions = {};
for (const [name, render] of Object.entries(CARDS)) {
  for (const theme of ["dark", "light"]) {
    const svg = render(data, theme);
    versions[`${name}-${theme}`] = createHash("sha1").update(svg).digest("hex").slice(0, 8);
    await writeFile(new URL(`${name}-${theme}.svg`, outDir), svg);
  }
}
console.log(`Rendered ${Object.keys(CARDS).length * 2} cards into variants/cards/`);

// Preview pages: full README mock-ups built from the cards above.
const HEADER = `<img width='100%' src='https://capsule-render.vercel.app/api?type=waving&height=200&fontAlign=80&fontAlignY=40&color=gradient&customColorList=12' />`;
const FOOTER = `<br><p align='center'>Most of my substantial work is commissioned and kept private.</p>`;
const GRS = "https://grs.marioparaschiv.com/api";
const GRS_STATS = `${GRS}?cache_seconds=30&username=marioparaschiv&title_color=4F8CC9&show_icons=true&bg_color=00000000&hide_border=true&icon_color=4F8CC9&include_all_commits=true&hide_title=true&count_private=true&show=prs_merged%2Cprs_merged_percentage&text_bold=false`;
const GRS_LANGS = `${GRS}/top-langs/?cache_seconds=30&username=marioparaschiv&layout=donut&bg_color=00000000&hide_border=true&count_private=true&hide_title=true&langs_count=6&text_bold=false`;

const picture = (name, width = "") =>
  `<picture><source srcset="cards/${name}-dark.svg?v=${versions[`${name}-dark`]}" media="(prefers-color-scheme: dark)"><img src="cards/${name}-light.svg?v=${versions[`${name}-light`]}" alt="${name}"${width ? ` width="${width}"` : ""}></picture>`;
const grs = (url, dark, light) =>
  `<picture><source srcset="${url}&text_color=${dark}" media="(prefers-color-scheme: dark)"><img src="${url}&text_color=${light}"></picture>`;
const center = (...items) => `<p align="center">\n${items.join("\n")}\n</p>`;
const pair = (a, b) => center(picture(a, "49%"), picture(b, "49%"));

const VARIANTS = {
  "d-tui": {
    title: "D. TUI",
    blurb: "One terminal dashboard: agent stats, GitHub reach, languages, models and the activity heatmap.",
    body: [center(picture("tui"))],
  },
  "a-agent-first": {
    title: "A. Agent-first",
    blurb: "Replaces the classic GitHub cards with agent activity, model mix and a 24/7 heatmap.",
    body: [pair("t3", "agent-ops"), pair("models", "tools"), center(picture("heatmap"))],
  },
  "b-terminal": {
    title: "B. Terminal",
    blurb: "Minimal: one animated terminal that types out agent and reach stats, then the reach card.",
    body: [center(picture("terminal")), center(picture("reach"))],
  },
  "c-dashboard": {
    title: "C. Full dashboard",
    blurb: "Keeps your current cards, adds reach and agent activity, with the details tucked into expandable sections.",
    body: [
      center(grs(GRS_STATS, "e6edf3", "1f2328"), grs(GRS_LANGS, "e6edf3", "1f2328")),
      pair("reach", "t3"),
      `<details>\n<summary><b>How my agents work</b></summary>\n\n${center(picture("agent-ops"))}\n\n${center(picture("heatmap"))}\n\n${pair("models", "tools")}\n\n</details>`,
    ],
  },
};

const variantsDir = new URL("../variants/", import.meta.url);
const index = [
  "# README variants",
  "",
  "Previews only. The real profile README is unchanged. Toggle GitHub's light/dark theme to see both card themes.",
  "",
  "Cards are a static snapshot. Regenerate on the VPS with:",
  "",
  "```sh",
  "node scripts/agent-stats.mjs > data/agent-stats.json",
  "node scripts/t3-stats.mjs > data/t3-stats.json",
  "node scripts/github-stats.mjs > data/github-stats.json",
  "node scripts/render.mjs",
  "```",
  "",
];
for (const [slug, variant] of Object.entries(VARIANTS)) {
  const page = [`<!-- ${variant.title}: ${variant.blurb} -->`, HEADER, "", ...variant.body.flatMap((b) => [b, ""]), FOOTER, ""].join("\n");
  await writeFile(new URL(`${slug}.md`, variantsDir), page);
  index.push(`- [${variant.title}](${slug}.md): ${variant.blurb}`);
}
index.push("", "## All cards", "", ...Object.keys(CARDS).flatMap((name) => [center(picture(name)), ""]));
await writeFile(new URL("README.md", variantsDir), index.join("\n"));

// The live profile README: the TUI card and the footer, no header. Paths are relative to the repo root.
const profile = [center(picture("tui").replace(/"cards\//g, '"variants/cards/')), "", FOOTER, ""].join("\n");
await writeFile(new URL("../README.md", import.meta.url), profile);
console.log("Wrote README.md");
console.log(`Wrote ${Object.keys(VARIANTS).length} variant pages into variants/`);
