# Headless fetching (optional)

This document describes the optional headless-fetching capability for the `data-collection` verifier tool and how to enable it locally.

Note: the verifier currently performs normal HTTP fetches using `requests`. Headless fetching is useful for pages that are fully rendered client-side (JS frameworks) and require a browser to obtain the hydrated HTML.

## Install Playwright (recommended)

1. Create and activate a Python virtual environment (optional but recommended):

   ```bash
   python3 -m venv .venv_verify_parsing
   source .venv_verify_parsing/bin/activate
   pip install --upgrade pip
   ```

2. Install Playwright and its browsers:

   ```bash
   pip install playwright
   playwright install
   ```

3. (Optional) Install the synchronous API helper if you prefer (Playwright's sync API is included in `playwright` package).

## How headless fetching would work (usage)

When enabled, the verifier would use Playwright to launch a headless Chromium instance, navigate to the page, wait for network/JS to settle and then read `page.content()` to obtain hydrated HTML. This is typically slower than `requests` but necessary for JS-rendered pages.

Example CLI usage pattern (when supported by the script):

```bash
python -m src.tools.verify_parsing --players 3170 --live --use-headless --save-html
```

- `--use-headless`: instructs the verifier to use Playwright for fetching the page
- `--save-html`: saves the fetched page HTML into `data-collection/debug_html/` for inspection

## Implementation notes

If you want the script to use headless mode by default or opt-in, the verifier needs:

- a small `fetch_url_headless(url, save_html=False)` helper that imports `playwright.sync_api.sync_playwright` and returns `(html, final_url)`
- a CLI flag (`--use-headless`) propagated to `run_player_verification` / `run_tournament_verification`
- graceful fallback and helpful message if `playwright` isn't installed (print install steps above)

Security and platform notes

- Headless browsers download platform-specific browser binaries; `playwright install` must be run on the target machine and may require additional disk space.
- Running headless Chromium in CI may require extra configuration (e.g., disabling sandbox) depending on the runner.

## Troubleshooting

- If you see `ImportError: No module named playwright`, run `pip install playwright` inside the environment you're using to run the verifier.
- If the browser isn't installed, run `playwright install` after installing the package.

---

Document created for developer reference. If you'd like, I can now: 
- add the headless helper and CLI flag to `verify_parsing.py` and wire it up, or
- keep headless as documented but disabled, or
- implement a small automatic fallback when `requests` returns empty HTML.

Which should I do next?


