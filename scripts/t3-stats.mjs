// Aggregates T3 Code's local state database into totals only.
// No titles, prompts, paths or repo names leave this script.
// Usage: node scripts/t3-stats.mjs > data/t3-stats.json

import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(join(homedir(), ".t3/userdata/statev2.sqlite"), { readOnly: true });
const one = (sql) => db.prepare(sql).get();
const all = (sql) => db.prepare(sql).all();

const threads = one(`
  select count(*) as total,
    sum(json_extract(payload_json, '$.createdBy') = 'agent') as byAgents,
    sum(json_extract(payload_json, '$.creationSource') = 'mobile') as fromMobile,
    sum(json_extract(payload_json, '$.worktreePath') like '%/.t3/worktrees/%') as inWorktrees,
    min(created_at) as firstAt
  from orchestration_v2_projection_threads where deleted_at is null`);

const runs = one(`
  select count(*) as total,
    sum(status = 'completed') as completed,
    sum((julianday(completed_at) - julianday(requested_at)) * 86400000) as workMs,
    max((julianday(completed_at) - julianday(requested_at)) * 86400000) as longestMs
  from orchestration_v2_projection_runs`);

const busiestDay = one(`
  select substr(requested_at, 1, 10) as day, count(*) as runs
  from orchestration_v2_projection_runs group by day order by runs desc limit 1`);

// Most runs in flight at the same moment.
const peak = one(`
  with events as (
    select requested_at as t, 1 as d from orchestration_v2_projection_runs where completed_at is not null
    union all
    select completed_at, -1 from orchestration_v2_projection_runs where completed_at is not null
  )
  select max(c) as runs from (select sum(d) over (order by t, d rows unbounded preceding) as c from events)`);

const subagents = one(`select count(*) as total from orchestration_v2_projection_subagents`);

const items = Object.fromEntries(
  all(`
    select type, count(*) as n from orchestration_v2_projection_turn_items
    where type in ('command_execution', 'file_change', 'dynamic_tool', 'web_search', 'reasoning')
    group by type`).map((r) => [r.type, r.n]),
);

// Pull requests linked to threads, deduplicated by URL, latest snapshot wins.
const prs = all(`
  select json_extract(j.value, '$.url') as url,
    json_extract(j.value, '$.snapshot.state') as state,
    json_extract(j.value, '$.snapshot.additions') as additions,
    json_extract(j.value, '$.snapshot.deletions') as deletions,
    json_extract(j.value, '$.linkedAt') as linkedAt,
    json_extract(j.value, '$.snapshot.mergedAt') as mergedAt,
    json_extract(j.value, '$.snapshot.syncedAt') as syncedAt
  from orchestration_v2_projection_threads t, json_each(json_extract(t.payload_json, '$.pullRequests')) j`);
const latest = new Map();
for (const pr of prs) {
  const seen = latest.get(pr.url);
  if (!seen || (pr.syncedAt ?? "") > (seen.syncedAt ?? "")) latest.set(pr.url, pr);
}
const merged = [...latest.values()].filter((pr) => pr.state === "merged");
const mergeMinutes = merged
  .map((pr) => (Date.parse(pr.mergedAt) - Date.parse(pr.linkedAt)) / 60000)
  .filter((m) => Number.isFinite(m) && m >= 0)
  .sort((a, b) => a - b);

const stats = {
  generatedAt: new Date().toISOString(),
  firstThreadAt: threads.firstAt,
  threads: threads.total,
  threadsByAgents: threads.byAgents,
  threadsFromMobile: threads.fromMobile,
  threadsInWorktrees: threads.inWorktrees,
  runs: runs.total,
  runCompletionRate: runs.completed / runs.total,
  runHours: Math.round(runs.workMs / 3_600_000),
  longestRunMinutes: Math.round(runs.longestMs / 60000),
  busiestDay,
  peakParallelRuns: peak.runs,
  subagents: subagents.total,
  commandsRun: items.command_execution ?? 0,
  fileChanges: items.file_change ?? 0,
  toolCalls: items.dynamic_tool ?? 0,
  webSearches: items.web_search ?? 0,
  prsLinked: latest.size,
  prsMerged: merged.length,
  linesAdded: merged.reduce((sum, pr) => sum + (pr.additions ?? 0), 0),
  linesDeleted: merged.reduce((sum, pr) => sum + (pr.deletions ?? 0), 0),
  medianMinutesToMerge: Math.round(mergeMinutes[Math.floor(mergeMinutes.length / 2)] ?? 0),
};
process.stdout.write(`${JSON.stringify(stats, null, 2)}\n`);
