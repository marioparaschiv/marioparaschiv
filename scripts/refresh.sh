#!/usr/bin/env bash
# Regenerates the stats cards and README, then pushes if anything changed.
# Runs every six hours from the profile-stats systemd user timer on the VPS.
set -euo pipefail

cd "$(dirname "$0")/.."
git pull --rebase --quiet

node scripts/agent-stats.mjs > data/agent-stats.json.tmp
node scripts/t3-stats.mjs > data/t3-stats.json.tmp 2> /dev/null
node scripts/github-stats.mjs > data/github-stats.json.tmp
# Only replace the data once every collector has succeeded.
for name in agent t3 github; do mv "data/$name-stats.json.tmp" "data/$name-stats.json"; done

node scripts/render.mjs

git add README.md data cards
if git diff --cached --quiet; then
	echo "No changes."
	exit 0
fi
git commit --quiet -m "Refresh stats"
git push --quiet
echo "Pushed $(git rev-parse --short HEAD)."
