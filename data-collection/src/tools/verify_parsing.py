"""
Verification script for GoMafia parsing logic.

Usage (from repo root):
    python -m src.tools.verify_parsing --players 3170,1234 --live --save-html
    python -m src.tools.verify_parsing --fixtures data-collection/tests/fixtures/player_3170.html

This script is intentionally non-destructive: it will not perform any database operations.
"""

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

import requests
from bs4 import BeautifulSoup

# Import project modules (models, config)
from ..config import config
from ..models import PlayerData, TournamentData, GameData, GameParticipationData
from datetime import datetime


DEBUG_DIR = Path("debug_html")


def apply_delay() -> None:
    """Respect configured scraping delays."""
    try:
        min_delay = float(config.scraping.delay_min)
        max_delay = float(config.scraping.delay_max)
    except Exception:
        min_delay, max_delay = 1.0, 3.0

    delay = random.uniform(min_delay, max_delay)
    time.sleep(delay)


def fetch_url(url: str, save_html: bool = False) -> Tuple[Optional[str], Optional[str]]:
    """Fetch a URL and optionally save HTML. Returns (html, final_url)."""
    headers = None
    try:
        headers = config.get_headers()
    except Exception:
        headers = {"User-Agent": "verify-parsing/1.0"}

    apply_delay()

    try:
        resp = requests.get(url, headers=headers, timeout=getattr(config.scraping, 'request_timeout', 20))
        resp.raise_for_status()
        html = resp.text

        if save_html:
            DEBUG_DIR.mkdir(parents=True, exist_ok=True)
            ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
            fname = DEBUG_DIR / f"page_{ts}.html"
            with open(fname, 'w', encoding='utf-8') as f:
                f.write(html)

        return html, resp.url

    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return None, None


# -----------------------------
# Heuristic parsers (lightweight)
# -----------------------------


def extract_player_raw_from_html(html: str, url: str) -> Dict[str, str]:
    """Extract a minimal raw dict for a player page using heuristics.
    Fields are intentionally permissive (strings) — model will normalize.
    """
    soup = BeautifulSoup(html, 'lxml')
    page_text = soup.get_text(separator=' ', strip=True)

    raw: Dict[str, str] = {}
    raw['profile_url'] = url

    # ID from URL
    m = re.search(r'/stats/(\d+)', url)
    if m:
        raw['go_mafia_id'] = int(m.group(1))

    # Nickname: try h1, og:title, title
    nickname = None
    h1 = soup.find('h1')
    if h1:
        nickname = h1.get_text(strip=True)

    if not nickname:
        og = soup.find('meta', property='og:title')
        if og and og.get('content'):
            nickname = og['content']

    if not nickname and soup.title:
        nickname = soup.title.get_text(strip=True)

    if nickname:
        # Clean common suffixes like " — GoMafia"
        nickname = re.sub(r'\s+[—-].*$', '', nickname).strip()
        raw['current_nickname'] = nickname

    # Registration text
    reg_match = re.search(r'на сайте с\s*(\d{4})', page_text, re.IGNORECASE)
    if reg_match:
        raw['registration_text'] = f"на сайте с {reg_match.group(1)} года"

    # ELO heuristics: look for nearby keywords
    elo_match = None
    for keyword in [r'Эло', r'ELO', r'Рейтинг', r'Рейтинг:']:
        m = re.search(rf'{keyword}[\s:\u00A0]*(\d{{3,4}})', page_text, re.IGNORECASE)
        if m:
            elo_match = m.group(1)
            break

    if elo_match:
        raw['current_elo'] = elo_match

    # Games played / won
    gp_match = re.search(r'игр[а-яА-Я]*[\s:\u00A0]*(\d+)', page_text)
    if gp_match:
        raw['games_played'] = gp_match.group(1)

    gw_match = re.search(r'выигра(л|но|ли)[\s:\u00A0]*(\d+)', page_text)
    if gw_match:
        raw['games_won'] = gw_match.group(2)

    # Win rate percent
    wr_match = re.search(r'(\d{1,3}[.,]?\d?)\s*%\s*(?:выигр|win|win rate)?', page_text, re.IGNORECASE)
    if wr_match:
        raw['win_rate'] = wr_match.group(1)

    # Fallback: include page_text for manual inspection by model parsers (not used directly)
    raw['full_text_snippet'] = page_text[:200]

    return raw


def extract_tournament_raw_from_html(html: str, url: str) -> Dict[str, str]:
    """Extract a minimal raw dict for a tournament page using heuristics."""
    soup = BeautifulSoup(html, 'lxml')
    page_text = soup.get_text(separator=' ', strip=True)

    raw: Dict[str, str] = {}
    raw['source_url'] = url

    # Name heuristics
    name = None
    h1 = soup.find('h1')
    if h1:
        name = h1.get_text(strip=True)
    if not name and soup.title:
        name = soup.title.get_text(strip=True)
    if name:
        raw['name'] = re.sub(r'\s+[—-].*$', '', name).strip()

    # Date heuristics (dd.mm.yyyy)
    dates = re.findall(r'(\d{2}\.\d{2}\.\d{4})', page_text)
    if dates:
        raw['start_date_text'] = dates[0]
        if len(dates) > 1:
            raw['end_date_text'] = dates[1]

    # Participation like "230 из 230"
    p_match = re.search(r'(\d+)\s*из\s*(\d+)', page_text)
    if p_match:
        raw['participation_text'] = f"{p_match.group(1)} из {p_match.group(2)}"

    # Entry fee / prize pool heuristics (numbers with currency symbols)
    money_match = re.search(r'([\d\s,.]+)\s*(₽|руб|RUB|р\.)', page_text, re.IGNORECASE)
    if money_match:
        raw['prize_pool_text'] = money_match.group(0)

    raw['full_text_snippet'] = page_text[:200]

    return raw


# -----------------------------
# Runner and reporting
# -----------------------------


def run_player_verification(identifier: str, live: bool, save_html: bool, verbose: bool) -> Dict:
    """Fetch (or load) player page, build raw_data, parse into PlayerData and validate.

    If `live` is False and `identifier` points to an existing file, treat it as a fixture
    and load HTML from disk.
    """
    html = None
    final_url = None

    # Fixture path case (local file) — only when not fetching live
    p = Path(identifier)
    if (not live) and p.exists() and p.is_file():
        try:
            html = p.read_text(encoding='utf-8')
            final_url = f"file://{p.resolve()}"
        except Exception:
            return {"id": identifier, "error": "fixture_read_error"}
    else:
        # Determine URL for live fetching or ID-based fetch
        if re.match(r'^https?://', identifier):
            url = identifier
        elif identifier.isdigit():
            url = config.scraping.base_url.rstrip('/') + f"/stats/{identifier}"
        else:
            return {"id": identifier, "error": "invalid_identifier"}

        final_url = url
        if live:
            html, final_url = fetch_url(url, save_html=save_html)
            if not html:
                return {"id": identifier, "error": "failed_fetch"}

    raw = extract_player_raw_from_html(html, final_url)

    # Helper: save raw HTML fixture for failing cases
    def _save_fixture(content: str, kind: str, ident: str) -> str:
        fixtures_dir = Path(__file__).resolve().parents[2] / 'tests' / 'fixtures'
        fixtures_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        safe_id = re.sub(r'[^0-9A-Za-z_.-]', '_', str(ident))
        fname = fixtures_dir / f"{kind}_{safe_id}_{ts}.html"
        try:
            with open(fname, 'w', encoding='utf-8') as f:
                f.write(content)
            return str(fname)
        except Exception:
            return ''

    # Attempt to create model and validate
    try:
        player = PlayerData.from_scraped_data(raw)
        validation = player.validate_data()

        result = {
            "id": raw.get('go_mafia_id') or identifier,
            "parsed": player.dict(),
            "validation": {
                "is_valid": validation.is_valid,
                "errors": validation.errors,
                "warnings": validation.warnings
            }
        }

        # On validation failure, save fixture for inspection
        if not validation.is_valid:
            if html:
                saved = _save_fixture(html, 'player', identifier)
                if saved:
                    result['fixture'] = saved
                    print(f"Saved failing player fixture: {saved}")

        if verbose:
            print(json.dumps(result, indent=2, ensure_ascii=False))

        return result

    except Exception as e:
        # On unexpected parsing exception, save the raw HTML for diagnosis
        out: Dict = {"id": identifier, "error": str(e), "raw": raw}
        if html:
            saved = _save_fixture(html, 'player_error', identifier)
            if saved:
                out['fixture'] = saved
        return out


def run_tournament_verification(identifier: str, live: bool, save_html: bool, verbose: bool) -> Dict:
    # Fixture path case
    html = None
    final_url = None
    p = Path(identifier)
    if (not live) and p.exists() and p.is_file():
        try:
            html = p.read_text(encoding='utf-8')
            final_url = f"file://{p.resolve()}"
        except Exception:
            return {"id": identifier, "error": "fixture_read_error"}
    else:
        # Determine URL similarly
        if re.match(r'^https?://', identifier):
            url = identifier
        elif identifier.isdigit():
            url = config.scraping.base_url.rstrip('/') + f"/tournaments/{identifier}"
        else:
            return {"id": identifier, "error": "invalid_identifier"}

        final_url = url
        if live:
            html, final_url = fetch_url(url, save_html=save_html)
            if not html:
                return {"id": identifier, "error": "failed_fetch"}

    raw = extract_tournament_raw_from_html(html, final_url)

    def _save_fixture(content: str, kind: str, ident: str) -> str:
        fixtures_dir = Path(__file__).resolve().parents[2] / 'tests' / 'fixtures'
        fixtures_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        safe_id = re.sub(r'[^0-9A-Za-z_.-]', '_', str(ident))
        fname = fixtures_dir / f"{kind}_{safe_id}_{ts}.html"
        try:
            with open(fname, 'w', encoding='utf-8') as f:
                f.write(content)
            return str(fname)
        except Exception:
            return ''

    try:
        tournament = TournamentData.from_scraped_data(raw)
        validation = tournament.validate_data()

        result = {
            "id": raw.get('go_mafia_tournament_id') or identifier,
            "parsed": tournament.dict(),
            "validation": {
                "is_valid": validation.is_valid,
                "errors": validation.errors,
                "warnings": validation.warnings
            }
        }

        if not validation.is_valid:
            if html:
                saved = _save_fixture(html, 'tournament', identifier)
                if saved:
                    result['fixture'] = saved
                    print(f"Saved failing tournament fixture: {saved}")

        if verbose:
            print(json.dumps(result, indent=2, ensure_ascii=False))

        return result

    except Exception as e:
        out: Dict = {"id": identifier, "error": str(e), "raw": raw}
        if html:
            saved = _save_fixture(html, 'tournament_error', identifier)
            if saved:
                out['fixture'] = saved
        return out


def print_summary(results: Dict[str, Dict]) -> None:
    """Print a compact summary of verification results."""
    for kind, items in results.items():
        print(f"\n=== {kind.upper()} RESULTS ===")
        for res in items:
            if res.get('error'):
                print(f"- {res.get('id')}: ERROR -> {res.get('error')}")
            else:
                valid = res['validation']['is_valid']
                errs = len(res['validation'].get('errors', []))
                warns = len(res['validation'].get('warnings', []))
                print(f"- {res.get('id')}: valid={valid}, errors={errs}, warnings={warns}")


def main(argv=None):
    parser = argparse.ArgumentParser(description='Verify GoMafia parsing without DB writes')
    parser.add_argument('--players', type=str, help='Comma-separated player IDs or fixture paths or URLs')
    parser.add_argument('--tournaments', type=str, help='Comma-separated tournament IDs or fixture paths or URLs')
    parser.add_argument('--live', action='store_true', help='Fetch pages from the live site')
    parser.add_argument('--save-html', action='store_true', help='Save fetched HTML to debug_html/')
    parser.add_argument('--fail-on-error', action='store_true', help='Exit with non-zero code if any parse has errors')
    parser.add_argument('--verbose', action='store_true', help='Print full parsed objects')

    args = parser.parse_args(argv)

    results = {"players": [], "tournaments": []}
    had_error = False

    if args.players:
        ids = [s.strip() for s in args.players.split(',') if s.strip()]
        for identifier in ids:
            print(f"Verifying player: {identifier}")
            res = run_player_verification(identifier, live=args.live, save_html=args.save_html, verbose=args.verbose)
            results['players'].append(res)
            if res.get('error') or (res.get('validation') and not res['validation']['is_valid']):
                had_error = True

    if args.tournaments:
        ids = [s.strip() for s in args.tournaments.split(',') if s.strip()]
        for identifier in ids:
            print(f"Verifying tournament: {identifier}")
            res = run_tournament_verification(identifier, live=args.live, save_html=args.save_html, verbose=args.verbose)
            results['tournaments'].append(res)
            if res.get('error') or (res.get('validation') and not res['validation']['is_valid']):
                had_error = True

    print_summary(results)

    if had_error and args.fail_on_error:
        print('\nOne or more verifications failed or produced validation errors')
        sys.exit(2)

    print('\nVerification complete')


if __name__ == '__main__':
    main()
