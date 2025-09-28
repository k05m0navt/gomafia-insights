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

# Module-level helpers for normalization and JSON extraction
import html as _html


def normalize_text(s: Optional[str]) -> str:
    """Normalize whitespace and common unicode spacing characters to regular spaces and collapse them.
    Returns empty string for None inputs.
    """
    if s is None:
        return ''
    t = str(s)
    # Replace common non-breaking/thin/narrow spaces and non-breaking hyphen
    t = t.replace('\u00A0', ' ').replace('\u2009', ' ').replace('\u202F', ' ').replace('\u2011', '-')
    # Unescape HTML entities
    t = _html.unescape(t)
    # Collapse multiple whitespace into single space
    t = re.sub(r"\s+", ' ', t)
    return t.strip()


def safe_load_json(text: str) -> Optional[dict]:
    """Attempt to load JSON from a string. If the string contains a JS assignment
    like `window.__NEXT_DATA__ = {...};` extract the first top-level object braces and parse.
    Returns a dict on success or None on failure.
    """
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        # Try to extract first balanced {...} block heuristically
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end+1]
            try:
                return json.loads(candidate)
            except Exception:
                return None
        return None


def extract_json_candidates(html: str) -> list:
    """Collect potential JSON payloads from <script> tags in the HTML.
    Returns list of raw script strings to attempt parsing.
    """
    soup = BeautifulSoup(html, 'lxml')
    candidates = []
    # Typed JSON scripts (application/json, application/ld+json) and Next's __NEXT_DATA__
    for script in soup.find_all('script'):
        ttype = (script.get('type') or '').lower()
        sid = script.get('id') or ''
        text = script.string or script.get_text() or ''
        if not text:
            continue
        if 'application/json' in ttype or 'ld+json' in ttype:
            candidates.append(text)
            continue
        if sid == '__NEXT_DATA__' or '__NEXT_DATA__' in text or 'window.__INITIAL_DATA__' in text or 'window.__NEXT_DATA__' in text:
            candidates.append(text)
            continue
        # Generic inline scripts that look like assignments
        if re.search(r'\b(window|var|let|const)\b.*=\s*\{', text):
            candidates.append(text)
    return candidates


def find_objects_with_keys(obj, key_set, max_depth=6, _depth=0):
    """Recursively search dict/list for objects that contain any of the keys in key_set.
    Returns a list of dict candidates.
    """
    results = []
    if _depth > max_depth:
        return results
    if isinstance(obj, dict):
        lower_keys = {k.lower() for k in obj.keys()}
        if lower_keys & key_set:
            results.append(obj)
        for v in obj.values():
            results.extend(find_objects_with_keys(v, key_set, max_depth, _depth+1))
    elif isinstance(obj, list):
        for item in obj:
            results.extend(find_objects_with_keys(item, key_set, max_depth, _depth+1))
    return results


def parse_int_like(s: Optional[str]) -> Optional[int]:
    if s is None:
        return None
    t = normalize_text(str(s))
    # Remove percent sign if present (we don't want percent in ints)
    t = t.replace('%', '')
    # Remove common thousands separators and non-digit characters
    t = t.replace('\u00A0', '').replace('\u2009', '').replace('\u202F', '')
    t = re.sub(r'[^0-9\-]', '', t)
    if not t:
        return None
    try:
        return int(t)
    except Exception:
        try:
            return int(float(t))
        except Exception:
            return None


def parse_float_like(s: Optional[str]) -> Optional[float]:
    if s is None:
        return None
    t = normalize_text(str(s))
    is_percent = '%' in t
    t = t.replace('%', '')
    # Replace non-breaking spaces
    t = t.replace('\u00A0', '').replace('\u2009', '').replace('\u202F', '')
    # If comma used as decimal and dot not present, convert comma to dot
    if ',' in t and '.' not in t:
        t = t.replace(',', '.')
    # Remove any character that isn't digit, dot, or minus
    t = re.sub(r'[^0-9\.\-]', '', t)
    if not t:
        return None
    try:
        val = float(t)
        if is_percent and val > 1:
            return val / 100.0
        return val
    except Exception:
        return None

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

    # Try to extract structured data from Next.js __NEXT_DATA__ if available
    try:
        script = soup.find('script', id='__NEXT_DATA__', type='application/json')
        if script and script.string:
            try:
                data = json.loads(script.string)
                user = data.get('props', {}).get('pageProps', {}).get('serverData', {}).get('user')
                if isinstance(user, dict):
                    # ID
                    if user.get('id'):
                        try:
                            uid = int(user.get('id'))
                        except Exception:
                            uid = None
                        if uid:
                            raw['go_mafia_id'] = uid
                            raw['profile_url'] = f"https://gomafia.pro/stats/{uid}"
                    # Prefer login as nickname if present
                    if user.get('login'):
                        raw['current_nickname'] = user.get('login')
                    # Fallback: combine first/last name
                    elif user.get('first_name') and user.get('last_name'):
                        raw['current_nickname'] = f"{user.get('first_name')} {user.get('last_name')}"
                    # Extract rating/games/wins/winRate when present in JSON
                    try:
                        if user.get('rating'):
                            try:
                                raw['current_elo'] = str(int(user.get('rating')))
                            except Exception:
                                pass
                        if user.get('elo') and 'current_elo' not in raw:
                            try:
                                raw['current_elo'] = str(int(user.get('elo')))
                            except Exception:
                                pass
                        if user.get('games'):
                            try:
                                raw['games_played'] = str(int(user.get('games')))
                            except Exception:
                                pass
                        if user.get('wins'):
                            try:
                                raw['games_won'] = str(int(user.get('wins')))
                            except Exception:
                                pass
                        if user.get('winRate') and 'win_rate' not in raw:
                            try:
                                # winRate may be percent (65) or decimal (0.65)
                                wr = float(user.get('winRate'))
                                if wr > 1:
                                    raw['win_rate'] = str(wr/100.0)
                                else:
                                    raw['win_rate'] = str(wr)
                            except Exception:
                                pass
                    except Exception:
                        pass
            except Exception:
                # Non-fatal: fall back to heuristics below
                pass
    except Exception:
        pass

    # If profile_url wasn't set by structured data, use provided URL
    if 'profile_url' not in raw:
        raw['profile_url'] = url

    # ID from URL (fallback)
    if 'go_mafia_id' not in raw:
        m = re.search(r'/stats/(\d+)', url)
        if m:
            try:
                raw['go_mafia_id'] = int(m.group(1))
            except Exception:
                pass

    # Nickname: try structured data (done above), then h1, then profile-specific DOM elements, then og:title/title
    nickname = raw.get('current_nickname')
    if not nickname:
        h1 = soup.find('h1')
        if h1:
            nickname = h1.get_text(strip=True)

    if not nickname:
        # Look for elements commonly used for profile name containers
        try:
            candidate = soup.find(class_=re.compile(r'profile[-_ ]?user|ProfileUserInfo|profile-user|profile_user', re.I))
            if candidate:
                # Some containers include other text; prefer a direct child with name-like styling
                text = candidate.get_text(separator=' ', strip=True)
                if text:
                    nickname = text.split('\n')[0].strip()
        except Exception:
            pass

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

    # Normalized text for numeric regexes (collapse NBSP/thin/narrow spaces)
    normalized_text = page_text.replace('\u00A0', ' ').replace('\u2009', ' ').replace('\u202F', ' ')

    # ELO heuristics: collect and normalize numeric candidates near rating keywords
    for keyword in [r'Эло', r'ELO', r'Рейтинг', r'Rating']:
        pat = rf"{keyword}\s*(?:\([^)]*\))?\s*[:\-]?\s*([0-9\s,\.]+)"
        m = re.search(pat, normalized_text, re.IGNORECASE)
        if m:
            raw_val = m.group(1)
            cleaned = parse_int_like(raw_val)
            if cleaned:
                raw['current_elo'] = str(cleaned)
                break

    # Games played / won (use normalized_text to handle unicode spaces)
    gp_match = re.search(r'(?:игр[а-яА-Я]*|games(?: played)?|games)\s*[:\-]?\s*([0-9\s,\.]+)', normalized_text, re.IGNORECASE)
    if gp_match:
        val = parse_int_like(gp_match.group(1))
        if val:
            raw['games_played'] = str(val)

    gw_match = re.search(r'(?:выигра(?:л|но|ли)|wins?|won)\s*[:\-]?\s*([0-9\s,\.]+)', normalized_text, re.IGNORECASE)
    if gw_match:
        val = parse_int_like(gw_match.group(1))
        if val:
            raw['games_won'] = str(val)

    # Win rate percent
    wr_match = re.search(r'(\d{1,3}[.,]?\d?)\s*%\s*(?:выигр|win|win rate)?', normalized_text, re.IGNORECASE)
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
