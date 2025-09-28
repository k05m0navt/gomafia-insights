# Repository Rules & Best Practices (GoMafia Insights)

This document centralizes the branching, access control, and contribution rules for collaborative development.

- **Branches:**
  - `main` — Protected release branch. No direct pushes. Only merged via PRs from `release/*` after approvals and CI green.
  - `develop` — Integration branch for completed features. Target branch for feature/bugfix PRs.
  - `staging` — Pre-release testing branch. Releases are promoted here from `develop`.
  - Long-lived branches MAY be added for major workstreams but keep workflow simple: feature → develop → staging → main.

- **Branch naming:**
  - Feature: `feature/<short-desc>`
  - Bugfix: `bugfix/<short-desc>`
  - Hotfix: `hotfix/<short-desc>` (branch from `main`)
  - Release: `release/vX.Y.Z`

- **Pull requests & merging:**
  - No direct pushes to `main`. All changes must come through PRs.
  - Require at least 1 approving review (recommend 2 for larger teams).
  - Require passing CI (lint, tests, build) before merging.
  - Use descriptive PR titles and link issue IDs.
  - Squash merges for small, single-commit features; keep merge strategy consistent (document team preference).

- **Access control & CODEOWNERS:**
  - Update `.github/CODEOWNERS` to list owners who must review critical paths.
  - Use your Git provider (GitHub/GitLab) to restrict who can push to protected branches.
  - For GitHub, use Branch Protection rules to:
    - Require pull requests before merging
    - Require status checks to pass
    - Require 1+ approving review
    - Enforce for admins
    - Optionally: restrict who can push/merge (teams/users)

- **Enforcing the ban on direct consolidation to `main`:**
  - Create a Branch Protection Rule for `main` enforcing:
    - "Require pull request reviews before merging" (1+) and "Require status checks to pass" (CI).
    - Check "Include administrators" to prevent admin bypass.
    - If you want to fully block pushes, use the "Restrict who can push to matching branches" option and allow only a release automation user or no one.
  - Example GitHub CLI (replace `{owner}` and `{repo}`):

    gh api --method PUT /repos/{owner}/{repo}/branches/main/protection -f required_status_checks='{"strict":true,"contexts":["ci/github-actions"]}' -f enforce_admins=true -f required_pull_request_reviews='{"required_approving_review_count":1}' -f restrictions='{"users":[],"teams":["your-team"]}'

  - Alternatively, use the web UI: Settings → Branches → Add rule → Pattern: `main` → enable required checks and reviewers → Save.

- **CI / Status checks:**
  - Add CI workflow that runs: install, lint, test, build. Mark these as required status checks in branch protection.
  - Ensure PRs cannot be merged until these checks pass.

- **Releases & hotfixes:**
  - Create `release/vX.Y.Z` from `develop`, run release validation, then open PR into `main` and `staging` as needed.
  - For critical hotfix from production, branch `hotfix/<desc>` from `main`, fix, open PR to `main`, merge, then cherry-pick or merge back to `develop`.

- **Commit hygiene & signing:**
  - Encourage conventional commits (e.g., `feat:`, `fix:`) for changelog automation.
  - Recommend enabling GPG/SSH-signed commits for core maintainers.

- **Onboarding & documentation:**
  - Add `CONTRIBUTING.md` at repo root (already added) and keep it updated.
  - Keep `.github/CODEOWNERS` maintained.
  - Document release process and CI checks in `DOCS/REPO_RULES.md`.

- **Enforcement notes:**
  - Branch protection must be configured on the Git host (requires org/repo admin rights).
  - For full automation, set up a small GitHub Action that labels or blocks PRs not following branch naming / templates — optional.

