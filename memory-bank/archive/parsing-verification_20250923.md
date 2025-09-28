# Archive: Parsing Verification (GoMafia)

Date: 2025-09-23 UTC
Branch: van/verify-gomafia-parsing-20250828T000000Z
Reflection: memory-bank/reflection/reflection-parsing-verification.md

Summary
- Hardened `verify_parsing.py` to prefer structured JSON (`__NEXT_DATA__`, `application/ld+json`, inline JS-assigned objects) and added robust numeric normalization and parsing utilities.
- Added fixtures and unit tests for exotic number formats and whitespace separators; test suite passes locally.

Successes
- Created a safe, non-destructive verification flow that does not write to the DB.
- Player model parsed and validated for sample IDs; tournament metadata parsed from server-side payloads.
- Implemented JSON-first extraction with DOM fallback and recursive search helpers.

Challenges
- Participant lists are often delivered client-side; static fetch misses client-rendered participants.
- Python environment differences required upgrading to Python 3.11 and migrating code for Pydantic v2.

Lessons Learned
- Prefer structured server payloads when available.
- Plan for client-side data (API discovery or headless rendering) for participant lists.
- Migrate model serialization to `model_dump()` to align with Pydantic v2.

Improvements Implemented
- Migrated validators to `field_validator` and replaced `Config` with `model_config = ConfigDict(...)` where needed.
- Added numeric whitespace normalization for NBSP/thin spaces and thousands separators.
- Enhanced JSON extraction to include `application/ld+json`, `application/json`, `__NEXT_DATA__`, and inline JS-assigned objects.
- Added fixtures and unit tests covering exotic number formats and English labels.
- Documented optional headless fetch mode in `data-collection/HEADLESS.md`.

Verification Results
- Local test suite: 7 passed
- Warnings: Pydantic deprecation warnings addressed via migration

Next Steps
1. Implement API discovery for tournament participants (preferred).
2. If API discovery fails, add optional Playwright headless fetch mode (`--render`) and harvest failing pages into `data-collection/tests/fixtures/`.
3. Continue migrating models to Pydantic v2 and replace deprecated APIs.

Reflection Document: memory-bank/reflection/reflection-parsing-verification.md

---
Archive created from reflection and verification notes.
