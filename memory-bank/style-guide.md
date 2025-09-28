L1: # Contributing to GoMafia Insights
L2:
L3: ## Branching strategy
L4: - `main`: Protected — only merged via pull requests. No direct pushes.
L5: - `develop`: Integration branch for completed features; target for feature branches.
L6: - `staging`: Pre-release testing; create `release/*` branches from `develop` and merge to `staging`.
L7: - Branch naming:
L8:   - Feature: `feature/<short-description>`
L9:   - Bugfix: `bugfix/<short-description>`
L10:   - Hotfix: `hotfix/<short-description>`
L11:   - Release: `release/vX.Y.Z`
L12:
L13: ## Pull request rules
L14: - Open a PR from a feature/bugfix/release branch into the target (`develop`, `staging`, or `main` only for releases).
L15: - Require at least 1 approving review (prefer 2 for larger teams).
L16: - All CI checks must pass before merging.
L17: - Use descriptive titles and link issue numbers when applicable.
L18:
L19: ## Do not push directly to `main`
L20: Direct pushes to `main` are prohibited. Always create a PR and follow review + CI gates.
L21:
L22: ## Merging
L23: - For regular features into `develop`/`staging`: use "Merge" or "Squash and merge" per team preference.
L24: - For `release/*` into `main`: create PR, tag release, and merge after approvals and CI green.
L25:
L26: ## Access control & CODEOWNERS
L27: - Update `.github/CODEOWNERS` to list owners who must review changes.
L28: - Configure branch protection in Git hosting (see `.github/BRANCH_PROTECTION.md`).
L29:
L30: ## Local workflow (examples)
L31: ```bash
L32: # create a feature branch
L33: git checkout -b feature/add-awesome-widget develop
L34: git push -u origin feature/add-awesome-widget
L35: # after changes:
L36: git commit -am "feat: add awesome widget"
L37: git push
L38: # open PR targeting develop
L39: ```
L40:
L41: ## Contacts & maintenance
L42: - Repository maintainers: replace with your team contacts in `.github/CODEOWNERS`
L43:
L44: ## Cursor directives
L45: The following guidelines are added so Cursor will follow the project's contributing rules when editing or proposing changes.
L46:
L47: - **Primary style file**: `CONTRIBUTING.md` — source of truth for branch and PR rules.
L48: - **Enforcement**: Cursor should read and honor `CONTRIBUTING.md` before making branching, PR, or merge-related edits.
L49: - **Editor behavior**: When authoring or suggesting edits that affect project workflow, Cursor must surface a short note referencing `CONTRIBUTING.md` and avoid edits that violate the branch rules (e.g., avoid direct `main` pushes).
L50: - **Automations**: Prefer adding CI checks or `.github` metadata instead of bypassing the contributing rules.
L51: - **Change proposals**: Any change that affects branching or release flow should include a short explanation and link to `CONTRIBUTING.md`.
L52:
L53: ## Automation suggestions for Cursor
L54: - Add a `.github/CURSOR_CONFIG.md` with machine-readable hints for editor bots.
L55: - Use PR templates in `.github/PULL_REQUEST_TEMPLATE.md` that reference `CONTRIBUTING.md`.
L56: - Add branch protection configs in `.github/BRANCH_PROTECTION.md` and CODEOWNERS updates.
L57:
L58: --
L59: This file is intended as the canonical style guide for the project. Editors and bots should consult it before making automated changes.
