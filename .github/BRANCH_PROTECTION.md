# Branch protection setup (GitHub)

Recommended protection for `main`:
- Require pull requests before merging
- Require 1+ approving review
- Require status checks (CI) to pass
- Enforce for admins
- Optional: restrict who can merge (maintainers or specific teams)

Example `gh` (GitHub CLI) commands — replace {owner} and {repo}:
gh api --method PUT /repos/{owner}/{repo}/branches/main/protection -f required_status_checks='{"strict":true,"contexts":["ci/github-actions"]}' -f enforce_admins=true -f required_pull_request_reviews='{"required_approving_review_count":1}' -f restrictions='{"users":[],"teams":["your-team"]}'

Or use the web UI: Settings → Branches → Add rule → Pattern: `main` → select required checks and reviewers.
