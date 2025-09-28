🎨🎨🎨 ENTERING CREATIVE PHASE: Verify Parsing — Design Options

**Component**: `data-collection/src/tools/verify_parsing.py` — `extract_player_raw_from_html()` and supporting helpers

## Purpose
Generate 2–4 viable design options for improving player data extraction from GoMafia.pro pages, analyze pros/cons, and produce a recommended approach with implementation guidelines suitable for a Level 2 task.

## Constraints
- Keep changes additive and non-destructive to existing CLI behavior.
- No new runtime dependencies unless explicitly justified.
- Prioritize reliability across Russian/English pages and number formats (NBSP/thin spaces, separators).
- Keep implementation effort within ~60–80 minutes where possible.

---

## Option A — JSON-first recursive extraction (Recommended)

Summary:
- Parse all `<script>` tags first (types: `application/json`, `application/ld+json`) and search for inline JS assignments (`window.__NEXT_DATA__`, `__INITIAL_DATA__`, `window.* = {...}`); parse JSON and recursively search for objects containing player-like keys.

Pros:
- Uses structured data where available — most robust and least brittle.
- Avoids fragile text regex on rendered markup.
- Easier to map fields (names, rating, stats) and apply normalization once.
- Fast: JSON loads and traversal are cheap relative to heavy DOM processing.

Cons:
- Not all pages include structured JSON — requires DOM fallback.
- Embedded JS may require small pre-processing to strip assignment wrappers.

Complexity & Time: 25–35 min

Implementation notes:
- Implement `extract_json_candidates(html)` to collect candidate strings, try `json.loads()`, otherwise extract RHS of assignment via regex and parse.
- Implement `find_objects_with_keys(obj, key_set, depth_limit=6)` returning strong candidates (require at least 2 expected keys present).
- Normalize candidate values via `normalize_text()` and use `parse_int_like()` / `parse_float_like()`.
- Use JSON-first then DOM fallback.

Verification:
- Unit test fixtures for pages with `__NEXT_DATA__`, `ld+json`, and inline assignment patterns.

Recommendation: Preferred for reliability and minimal maintenance.

---

## Option B — DOM-first with improved heuristics and compiled regexes

Summary:
- Keep primary approach DOM-based (BeautifulSoup selectors + text search), but replace fragile regexes with compiled, localized patterns, plus whitespace normalization and robust number parsing.

Pros:
- Works on pages lacking any structured JSON.
- Lower risk of missing values introduced by JSON variations if DOM contains visible text.
- Simpler to integrate if current code is DOM-heavy.

Cons:
- Still brittle across layout changes and language variations; regexes require careful ordering.
- More fragile than JSON approach; may need ongoing maintenance.

Complexity & Time: 30–45 min

Implementation notes:
- Add `normalize_text()` applied to all extracted text nodes.
- Compile multilingual patterns once (module-level) for ELO, games, wins, win-rate.
- Use `parse_int_like()`/`parse_float_like()` to coerce number strings.
- Prefer explicit selectors for known page regions, but fall back to regex on broader text.

Verification:
- Fixtures demonstrating NBSP/thin spaces, thousands separators, and multilingual labels.

Recommendation: Acceptable fallback, but not primary if structured JSON present.

---

## Option C — Hybrid with optional headless JS rendering (heavy)

Summary:
- When both JSON and DOM heuristics fail, run a headless browser (Playwright) to evaluate client-side JS and capture hydrated HTML or structured global variables.

Pros:
- Resolves pages that rely on client-side hydration; recovers data only available after JS runs.
- Highly robust when server responses omit structured payloads.

Cons:
- Much higher complexity, runtime cost, and CI friction (needs Playwright binaries, heavier runtime, ~minutes per page).
- Not suitable for quick Level 2 improvement; should be considered only if many pages require JS hydration.

Complexity & Time: Large (hours); Operational cost: non-trivial

Implementation notes:
- Make headless rendering optional behind a CLI flag `--headless` or `--hydrate`.
- Prefer to capture `window.__NEXT_DATA__` or `__INITIAL_DATA__` after hydration and reuse Option A path.

Verification:
- Only enable in local/manual runs or conditional CI tasks with cached browsers.

Recommendation: Keep as an opt-in extension — do not add by default for Level 2.

---

## Option D — Probabilistic / ML extraction (Not recommended for Level 2)

Summary:
- Train a small classifier or sequence labeling approach to extract fields from HTML/text when deterministic rules fail.

Pros:
- Can learn from many layouts and generalize across unseen formats.

Cons:
- High upfront cost, training data, infra; heavy maintenance; overkill for a small project enhancement.

Recommendation: Reject for current scope.

---

## Comparative Analysis
- Robustness: A > C > B > D
- Implementation speed (shortest first): A ≈ B < C << D
- Maintenance burden: A < B < C < D
- CI friendliness: A ≈ B >> D > C (C adds heavy infra)

## Recommended Approach
Adopt Option A (JSON-first recursive extraction) as the primary strategy, implement Option B improvements as fallback refinements, and optionally keep Option C as an opt-in helper for manual/hydrated-only debugging runs.

## Implementation Guidelines (step-by-step)
1. Add module-level compiled regexes and helper stubs:
   - `JSON_SCRIPT_TYPES = {'application/json','application/ld+json'}`
   - compiled regexes for assignment extraction: `re_assignment = re.compile(r"(?s)(?:window\.|var\s+)?([A-Za-z0-9_]+)\s*=\s*(\{.*?\});")`
2. Implement helpers in `data-collection/src/tools/parse_utils.py` (or inside `verify_parsing.py` if you prefer single-file):
   - `extract_json_candidates(html) -> list[str]`
   - `safe_load_json(text) -> Optional[dict]` with pre-strip for `window.* =` wrappers
   - `find_objects_with_keys(obj, key_set, depth_limit=6) -> list[dict]`
   - `normalize_text(s) -> str`
   - `parse_int_like(s) -> Optional[int]`
   - `parse_float_like(s) -> Optional[float]`
3. Update `extract_player_raw_from_html()` to:
   - Run `extract_json_candidates()` and attempt structured parsing first.
   - If a strong candidate found, map keys to raw fields and normalize values.
   - Else, run DOM-first heuristics with normalized text and compiled regex patterns.
   - Keep an audit log in debug mode showing which path returned the result.
4. Tests & fixtures:
   - Add 3–6 fixtures in `data-collection/debug_html/`/`data-collection/tests/fixtures/` covering JSON variants, NBSP/thin-space numbers, percent vs decimal win rates, and Russian labels.
   - Add unit tests that assert the raw dict fields and numeric conversions.
5. CLI & operational behavior:
   - Preserve existing flags. Add `--debug` to print extraction path and candidate matches; add optional `--hydrate` reserved for future headless runs.

## Verification Checklist (creative)
- [ ] JSON-first extraction implemented with recursive candidate search
- [ ] Whitespace normalization and number parsing utilities added
- [ ] Module-level compiled regexes for fallback DOM parsing
- [ ] 4 fixtures added demonstrating edge cases
- [ ] Unit tests for numeric parsing and JSON candidate extraction

🎨🎨🎨 EXITING CREATIVE PHASE
