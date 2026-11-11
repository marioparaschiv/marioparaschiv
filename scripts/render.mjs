// Renders the TUI card in both themes into cards/, then writes README.md from profile.md.
// Usage: node scripts/render.mjs

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tui } from "./tui.mjs";

const read = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const data = {
  agent: await read("data/agent-stats.json"),
  github: await read("data/github-stats.json"),
  t3: await read("data/t3-stats.json"),
};

const outDir = new URL("../cards/", import.meta.url);
await mkdir(outDir, { recursive: true });
// Content hash per file, appended to image URLs so browsers and GitHub's cache fetch new versions.
const versions = {};
for (const theme of ["dark", "light"]) {
  const svg = tui(data, theme);
  versions[theme] = createHash("sha1").update(svg).digest("hex").slice(0, 8);
  await writeFile(new URL(`tui-${theme}.svg`, outDir), svg);
}
console.log("Rendered 2 cards into cards/");

// The live profile README: profile.md with the TUI card in place of its marker.
const picture = `<picture><source srcset="cards/tui-dark.svg?v=${versions.dark}" media="(prefers-color-scheme: dark)"><img src="cards/tui-light.svg?v=${versions.light}" alt="tui"></picture>`;
const template = await readFile(new URL("../profile.md", import.meta.url), "utf8");
await writeFile(new URL("../README.md", import.meta.url), template.replace("<!-- tui -->", `<p align="center">\n${picture}\n</p>`));
console.log("Wrote README.md");
