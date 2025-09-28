# Contributing to GoMafia Insights

## Branching strategy
- `main`: Protected — only merged via pull requests. No direct pushes.
- `develop`: Integration branch for completed features; target for feature branches.
- `staging`: Pre-release testing; create `release/*` branches from `develop` and merge to `staging`.
- Branch naming:
  - Feature: `feature/<short-description>`
  - Bugfix: `bugfix/<short-description>`
  - Hotfix: `hotfix/<short-description>`
  - Release: `release/vX.Y.Z`

## Pull request rules
- Open a PR from a feature/bugfix/release branch into the target (`develop`, `staging`, or `main` only for releases).
- Require at least 1 approving review (prefer 2 for larger teams).
- All CI checks must pass before merging.
- Use descriptive titles and link issue numbers when applicable.

## Do not push directly to `main`
Direct pushes to `main` are prohibited. Always create a PR and follow review + CI gates.

## Merging
- For regular features into `develop`/`staging`: use "Merge" or "Squash and merge" per team preference.
- For `release/*` into `main`: create PR, tag release, and merge after approvals and CI green.

## Access control & CODEOWNERS
- Update `.github/CODEOWNERS` to list owners who must review changes.
- Configure branch protection in Git hosting (see `.github/BRANCH_PROTECTION.md`).

## Local workflow (examples)
```bash
# create a feature branch
git checkout -b feature/add-awesome-widget develop
git push -u origin feature/add-awesome-widget
# after changes:
git commit -am "feat: add awesome widget"
git push
# open PR targeting develop
```

## Contacts & maintenance
- Repository maintainers: replace with your team contacts in `.github/CODEOWNERS`

## Editor automation note
Editors and automation tools (including Cursor) should consult `memory-bank/style-guide.md` before making edits that affect branching, PRs, or repository workflow. See `memory-bank/style-guide.md` > "Cursor directives" for guidance on how to behave when proposing or applying changes.
