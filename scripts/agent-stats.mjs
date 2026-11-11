// Aggregates local coding-agent session logs (pi + Claude Code) into totals only.
// No prompts, paths, repo names or code leave this script.
// Usage: node scripts/agent-stats.mjs > data/agent-stats.json

import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const TIME_ZONE = "Europe/London";
const SOURCES = [
  { name: "pi", dir: join(homedir(), ".pi/agent/sessions"), parse: parsePi },
  { name: "claude-code", dir: join(homedir(), ".claude/projects"), parse: parseClaude },
];

const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23", weekday: "short" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const stats = {
  generatedAt: new Date().toISOString(),
  timeZone: TIME_ZONE,
  sessions: 0,
  sessionsBySource: {},
  firstSessionAt: null,
  activeDays: new Set(),
  agentTurns: 0,
  toolCalls: 0,
  tools: {},
  tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  modelTurns: {},
  // weekday (0 = Mon) x hour, counted in agent turns
  heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
  gitCommits: 0,
  gitPushes: 0,
  prsOpened: 0,
  subagents: 0,
  // Active (non-idle) time, see sessionClock.
  longestSessionMs: 0,
  agentMs: 0,
};

async function* jsonlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) yield join(entry.parentPath, entry.name);
  }
}

async function* lines(file) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // Skip partial lines from sessions still being written.
    }
  }
}

function normalizeModel(model) {
  if (!model || model === "<synthetic>") return null;
  return model.replace(/-\d{8}$/, "").replace(/\[.*\]$/, "");
}

function countTool(name, input) {
  stats.toolCalls++;
  const key = name.toLowerCase();
  stats.tools[key] = (stats.tools[key] ?? 0) + 1;
  const command = typeof input?.command === "string" ? input.command : "";
  if (/\bgit\s+commit\b/.test(command)) stats.gitCommits++;
  if (/\bgit\s+push\b/.test(command)) stats.gitPushes++;
  if (/\bgh\s+pr\s+create\b/.test(command)) stats.prsOpened++;
  if (/^(agent|task|delegate_task|spawn_agent|mcp__t3-code__delegate_task)$/.test(key)) stats.subagents++;
}

function countTurn(timestamp, model, usage) {
  stats.agentTurns++;
  const normalized = normalizeModel(model);
  if (normalized) stats.modelTurns[normalized] = (stats.modelTurns[normalized] ?? 0) + 1;
  for (const key of Object.keys(stats.tokens)) stats.tokens[key] += usage[key] ?? 0;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return;
  const parts = Object.fromEntries(hourFormat.formatToParts(date).map((p) => [p.type, p.value]));
  stats.heatmap[WEEKDAYS.indexOf(parts.weekday)][Number(parts.hour)]++;
  stats.activeDays.add(date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE }));
}

async function parsePi(file, session) {
  for await (const entry of lines(file)) {
    session.track(entry.timestamp);
    const message = entry.type === "message" ? entry.message : null;
    if (message?.role !== "assistant") continue;
    const u = message.usage ?? {};
    countTurn(entry.timestamp, message.model, {
      input: u.input,
      output: u.output,
      cacheRead: u.cacheRead,
      cacheWrite: u.cacheWrite,
      total: u.totalTokens,
    });
    for (const block of message.content ?? []) {
      if (block.type === "toolCall") countTool(block.name, block.arguments);
    }
  }
}

async function parseClaude(file, session) {
  const seen = new Set();
  for await (const entry of lines(file)) {
    session.track(entry.timestamp);
    if (entry.type !== "assistant" || !entry.message) continue;
    const { message } = entry;
    // Claude Code writes one line per content block; usage repeats per message.
    const id = message.id ?? entry.uuid;
    if (!seen.has(id)) {
      seen.add(id);
      const u = message.usage ?? {};
      const input = u.input_tokens ?? 0;
      const output = u.output_tokens ?? 0;
      const cacheRead = u.cache_read_input_tokens ?? 0;
      const cacheWrite = u.cache_creation_input_tokens ?? 0;
      countTurn(entry.timestamp, message.model, {
        input,
        output,
        cacheRead,
        cacheWrite,
        total: input + output + cacheRead + cacheWrite,
      });
    }
    for (const block of message.content ?? []) {
      if (block.type === "tool_use") countTool(block.name, block.input);
    }
  }
}

// Active time: gaps between consecutive log entries, capped so idle sessions don't count.
const IDLE_CAP_MS = 5 * 60 * 1000;

function sessionClock() {
  let first = Infinity;
  let previous = null;
  let active = 0;
  return {
    track(timestamp) {
      const t = Date.parse(timestamp);
      if (Number.isNaN(t)) return;
      first = Math.min(first, t);
      if (previous !== null && t > previous) active += Math.min(t - previous, IDLE_CAP_MS);
      previous = Math.max(previous ?? t, t);
    },
    get first() {
      return first;
    },
    get duration() {
      return active;
    },
  };
}

for (const source of SOURCES) {
  let count = 0;
  for await (const file of jsonlFiles(source.dir)) {
    const session = sessionClock();
    await source.parse(file, session);
    if (session.first === Infinity) continue;
    count++;
    stats.longestSessionMs = Math.max(stats.longestSessionMs, session.duration);
    stats.agentMs += session.duration;
    const first = new Date(session.first).toISOString();
    if (!stats.firstSessionAt || first < stats.firstSessionAt) stats.firstSessionAt = first;
  }
  stats.sessionsBySource[source.name] = count;
  stats.sessions += count;
}

stats.activeDays = stats.activeDays.size;
stats.tools = Object.fromEntries(Object.entries(stats.tools).sort((a, b) => b[1] - a[1]).slice(0, 12));
stats.modelTurns = Object.fromEntries(Object.entries(stats.modelTurns).sort((a, b) => b[1] - a[1]));
process.stdout.write(`${JSON.stringify(stats, null, 2)}\n`);
