# Branch protection (applied to `main`)

This file documents the exact, applied branch-protection settings for the `main` branch.

Rules applied to `main` (as of now):
- Require pull request reviews before merging
  - Required approving review count: 1
- Require status checks to pass before merging
  - Required checks (exact names):
    - `build-and-test`
    - `playwright-e2e`
- Include administrators: enabled
- Restrictions on who can push: none (personal repo — no user/team restrictions)

Notes:
- If you change CI job names, update this file to reflect the new check names.
- To tighten rules in an organization: add `restrictions` with teams/users and set `require_code_owner_reviews`.
