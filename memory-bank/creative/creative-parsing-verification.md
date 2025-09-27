🎨🎨🎨 ENTERING CREATIVE PHASE: Parsing Verification

**Component**: Parser Verification — validate model parsing logic before any DB writes.

## Purpose
Confirm scrapers produce correct raw payloads consumed by model `from_scraped_data()` methods and that `validate_data()` returns acceptable results — with zero DB side-effects.

## Constraints & Requirements
- **Must**: No database writes or imports of .
- **Must**: Support live fetching and fixture-based runs.
- **Must**: Surface parsed model instance () + validation summary (is_valid, errors, warnings).
- **Should**: Optionally save raw HTML to  for failed parses.
- **Should**: Be runnable from CLI under .

## Options Considered
- **Option A — Verification Script (recommended)**: quick CLI tool  that fetches pages (or loads fixtures), builds minimal raw dicts, calls model parsers and prints validation. No DB.
- **Option B — Fixture-based Unit Tests**: add fixtures in  and unit tests  to assert parsing results. Good for CI.
- **Option C — Dry-run Orchestrator**: instrument the orchestrator to run scrapers but skip DB writes (higher effort).

## Recommendation
Start with **Option A** to get immediate verification feedback; then create fixtures/tests (Option B) for regressions discovered. Use Option C only if broad end-to-end coverage is required.

## Implementation Plan (concrete)
1. Create  (non-destructive).
2. CLI flags: , , , , , , .
3. For each target, fetch page (respect  delays) or load fixture, extract minimal raw fields (defensive selectors), call  and , print concise JSON summary.
4. On failures and when  set, save HTML to .
5. Do NOT import or call any DB service; exit non-zero only when .

## Minimal raw fields to extract (examples)
- Player: , , , , , .
- Tournament: , , , , , .
- Game: , , , , .
- Participation: , , , , , , .

## CLI examples
- python -m data_collection.tools.verify_parsing --players 3170,1234 --live --save-html
- python -m data_collection.tools.verify_parsing --fixtures data-collection/tests/fixtures/player_3170.html

## Verification Checklist
- [ ] Script created at .
- [ ] Able to run in live mode with delays from .
- [ ] Able to run from fixtures for CI.
- [ ] Prints parsed object + validation summary for each item.
- [ ] Saves HTML on failures when requested.
- [ ] No DB writes performed.

## Next steps
1) Implement the verification script (Option A) on branch .
2) Run against 1–2 sample IDs and collect failing HTMLs as fixtures.
3) Add fixture-based unit tests for edge cases discovered.

🎨🎨🎨 EXITING CREATIVE PHASE
