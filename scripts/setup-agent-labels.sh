#!/usr/bin/env bash
# Create or update the issue labels used by the agent workflow (docs/AGENT_WORKFLOW.md).
# Idempotent. Usage: scripts/setup-agent-labels.sh [owner/repo]
set -euo pipefail

repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

labels=(
  "type:feature|1d76db|New user-facing functionality"
  "type:fix|d73a4a|Bug fix"
  "type:refactor|1d76db|Neither fixes a bug nor adds a feature"
  "type:style|1d76db|Formatting / CSS-only, no logic change"
  "type:docs|0075ca|Documentation only"
  "type:chore|1d76db|Tooling, dependencies, config"
  "type:db|b60205|Supabase migrations, RLS, edge functions (humans only)"
  "type:perf|1d76db|Performance"
  "type:test|1d76db|Adding or fixing tests"

  "area:kiosk|c5def5|Kiosk state machine, idle/auth/onboarding"
  "area:hub|c5def5|PixiJS profile hub"
  "area:discovery|c5def5|Gesture-based profile reveal"
  "area:games|c5def5|Mini-games"
  "area:cv|c5def5|Camera, hand tracking, pose detection"
  "area:mobile|c5def5|User pages, registration, claim, messages"
  "area:auth|c5def5|Admin / kiosk / user auth"
  "area:db|c5def5|Database, RLS, edge functions (humans only)"
  "area:ci|c5def5|CI, tooling, repo config"

  "agent:ready|0e8a16|Well-specified; adding this starts an agent run"
  "agent:in-progress|fbca04|An agent is working on this"
  "agent:review|5319e7|Agent opened a draft PR; needs human review"
  "agent:needs-human|d93f0b|Agent stopped; needs clarification or human work"

  "model:sonnet|bfdadc|Agent runs on Sonnet 5.5 (default)"
  "model:opus|bfdadc|Agent runs on Opus 5.5"
)

for entry in "${labels[@]}"; do
  IFS='|' read -r name color desc <<<"$entry"
  encoded=$(jq -rn --arg n "$name" '$n | @uri')
  if gh api "repos/$repo/labels/$encoded" --silent 2>/dev/null; then
    gh api -X PATCH "repos/$repo/labels/$encoded" -f color="$color" -f description="$desc" --silent
    echo "updated  $name"
  else
    gh api -X POST "repos/$repo/labels" -f name="$name" -f color="$color" -f description="$desc" --silent
    echo "created  $name"
  fi
done
