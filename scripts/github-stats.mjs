// Collects public GitHub reach stats via the gh CLI.
// Usage: node scripts/github-stats.mjs > data/github-stats.json

import { execFileSync } from "node:child_process";

const USER = "marioparaschiv";
const ORGS = ["enmity-mod", "discord-modifications", "unbound-app", "unbound-desktop", "kernel-addons", "SolidCord"];

const gh = (...args) => JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8", maxBuffer: 64 << 20 }));
const ghLines = (...args) => execFileSync("gh", ["api", ...args], { encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter(Boolean);

// Merged PRs into repos owned by someone else.
const merged = ghLines(
  "graphql",
  "--paginate",
  "-f",
  `query=query($endCursor: String) { search(type: ISSUE, query: "author:${USER} is:pr is:merged -user:${USER}", first: 100, after: $endCursor) { nodes { ... on PullRequest { repository { nameWithOwner stargazerCount owner { login } } } } pageInfo { hasNextPage endCursor } } }`,
  "--jq",
  ".data.search.nodes[].repository | [.nameWithOwner, .stargazerCount, .owner.login] | @tsv",
);
const externalRepos = new Map();
let externalPrs = 0;
for (const line of merged) {
  const [repo, stars, owner] = line.split("\t");
  if (ORGS.includes(owner)) continue;
  externalPrs++;
  externalRepos.set(repo, Number(stars));
}

// Release asset downloads across owned and org repos.
const owners = [USER, ...ORGS];
const downloads = [];
for (const owner of owners) {
  const repos = ghLines("--paginate", `users/${owner}/repos?per_page=100`, "--jq", ".[] | select(.fork | not) | .full_name");
  for (const repo of repos) {
    const counts = ghLines("--paginate", `repos/${repo}/releases?per_page=100`, "--jq", ".[].assets[].download_count");
    const total = counts.reduce((sum, n) => sum + Number(n), 0);
    if (total > 0) downloads.push({ repo, downloads: total });
  }
}
downloads.sort((a, b) => b.downloads - a.downloads);

// Stars across owned and org repos.
const starsQuery = gh(
  "graphql",
  "-f",
  `query={ user(login: "${USER}") { followers { totalCount } repositories(first: 100, ownerAffiliations: [OWNER, ORGANIZATION_MEMBER], orderBy: {field: STARGAZERS, direction: DESC}) { nodes { stargazerCount } } } }`,
);
const user = starsQuery.data.user;

const stats = {
  generatedAt: new Date().toISOString(),
  stars: user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0),
  followers: user.followers.totalCount,
  releaseDownloads: downloads.reduce((sum, d) => sum + d.downloads, 0),
  topDownloads: downloads.slice(0, 5),
  externalMergedPrs: externalPrs,
  externalRepos: externalRepos.size,
  externalRepoStars: [...externalRepos.values()].reduce((sum, n) => sum + n, 0),
  topExternalRepos: [...externalRepos]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([repo, stars]) => ({ repo, stars })),
};
process.stdout.write(`${JSON.stringify(stats, null, 2)}\n`);
