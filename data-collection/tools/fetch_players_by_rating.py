# data-collection/tools/fetch_players_by_rating.py
"""Fetch players from gomafia.pro rating pages and save JSONL + CSV.

Usage:
    python data-collection/tools/fetch_players_by_rating.py

Outputs:
    - data-collection/tools/players_by_rating.jsonl
    - data-collection/tools/players_by_rating.csv
    - on failures (if enabled): data-collection/tests/fixtures/failed_<region>_<year>_page<page>.html
"""
import time
import json
import re
import csv
import os
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup, NavigableString

BASE = "https://gomafia.pro/rating"
REGIONS = ["all", "central", "chernozem_region", "north", "siberia_and_ural", "far_east", "volga_region"]
YEARS = ["2022", "2023", "2024", "2025"]
RATE_LIMIT = 1.0  # seconds between requests
SAVE_FAILED_HTML = True
MAX_PAGES_PER_VIEW = 50  # safety cap to avoid infinite pagination

OUT_JSONL = "data-collection/tools/players_by_rating.jsonl"
OUT_CSV = "data-collection/tools/players_by_rating.csv"
FAILED_FIXTURES_DIR = "data-collection/tests/fixtures"

os.makedirs(os.path.dirname(OUT_JSONL), exist_ok=True)
os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
os.makedirs(FAILED_FIXTURES_DIR, exist_ok=True)


def normalize_region(region):
    return region if region else "unknown"


def build_url(region, year, page=1):
    params = {"tab": "users", "regionUsers": region, "yearUsers": year, "pageUsers": page}
    return f"{BASE}?{urlencode(params)}"


def _extract_name_club_and_id(td_element):
    """Extract name, club and profile id from the name cell (td element).

    Strategy:
    - If there is an <a>, use its text as name and extract numeric id from href (/stats/123).
    - Any text nodes or other tags following the <a> inside the same td are treated as the club (joined).
    - If no <a>, fall back to td text and split heuristically (last token(s) as club).
    """
    name = None
    club = None
    profile_id = None

    a = td_element.find("a")
    if a:
        name = a.get_text(strip=True)
        href = a.get("href")
        if href:
            m = re.search(r"/stats/(\d+)", href)
            if m:
                profile_id = m.group(1)
            else:
                profile_id = href
        parts = []
        for sib in a.next_siblings:
            if isinstance(sib, NavigableString):
                txt = sib.strip()
                if txt:
                    parts.append(txt)
            else:
                t = sib.get_text(strip=True)
                if t:
                    parts.append(t)
        club = " ".join(parts).strip() or None
    else:
        full = td_element.get_text(separator=" ", strip=True)
        if full:
            parts = full.split()
            if len(parts) >= 2:
                # assume first token is name, rest is club (best-effort)
                name = parts[0]
                club = " ".join(parts[1:])
            else:
                name = full
    return name, club, profile_id


def parse_table(html):
    """Return list of parsed rows with keys: name, club, profile_id, tournaments, points, elo, link"""
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("table tr")
    if not rows:
        rows = soup.find_all("tr")

    parsed = []
    for r in rows:
        tds = r.select("td")
        if not tds:
            continue
        if len(tds) < 3:
            continue
        # Name usually in second td
        name_td = tds[1]
        name, club, profile_id = _extract_name_club_and_id(name_td)

        tournaments = None
        points = None
        elo = None
        if len(tds) > 2:
            txt = tds[2].get_text(strip=True)
            tournaments = int(txt) if txt.isdigit() else None
        if len(tds) > 3:
            txt = tds[3].get_text(strip=True)
            num = re.sub(r"[^0-9]", "", txt)
            points = int(num) if num else None
        if len(tds) > 4:
            txt = tds[4].get_text(strip=True)
            num = re.sub(r"[^0-9]", "", txt)
            elo = int(num) if num else None

        link = None
        a = name_td.select_one("a")
        if a and a.get("href"):
            link = a.get("href")
        parsed.append({
            "name": name,
            "club": club,
            "profile_id": profile_id,
            "tournaments": tournaments,
            "points": points,
            "elo": elo,
            "link": link,
        })
    return parsed


def _add_region_for_year(entry, year, region):
    prev = entry["region_by_year"].get(year)
    if prev is None:
        entry["region_by_year"][year] = region
    else:
        if isinstance(prev, list):
            if region not in prev:
                prev.append(region)
        else:
            if prev != region:
                entry["region_by_year"][year] = [prev, region]


def _region_for_csv(region_entry):
    if region_entry is None:
        return ""
    if isinstance(region_entry, list):
        return "|".join(region_entry)
    return region_entry


def run(rate_limit=RATE_LIMIT, save_failed_html=SAVE_FAILED_HTML, out_jsonl=OUT_JSONL, out_csv=OUT_CSV):
    players = {}
    session = requests.Session()

    step = 0
    total_views = len(REGIONS) * len(YEARS)

    for region in REGIONS:
        for year in YEARS:
            page = 1
            pages_fetched = 0
            while page <= MAX_PAGES_PER_VIEW:
                step += 1
                url = build_url(region, year, page)
                print(f"Step {step}/{total_views} — Year={year} Region={normalize_region(region)} Page={page} — GET {url}", flush=True)
                try:
                    resp = session.get(url, timeout=30)
                except Exception as exc:
                    print(f"Request failed for {url}: {exc}", flush=True)
                    if save_failed_html:
                        fname = os.path.join(FAILED_FIXTURES_DIR, f"failed_{normalize_region(region)}_{year}_page{page}.html")
                        open(fname, "wb").write(str(exc).encode("utf-8"))
                    time.sleep(rate_limit)
                    break
                if resp.status_code != 200:
                    print("Failed", url, resp.status_code, flush=True)
                    if save_failed_html:
                        fname = os.path.join(FAILED_FIXTURES_DIR, f"failed_{normalize_region(region)}_{year}_page{page}.html")
                        open(fname, "wb").write(resp.content)
                    time.sleep(rate_limit)
                    break
                rows = parse_table(resp.text)
                print(f"  Parsed rows: {len(rows)}", flush=True)
                if not rows:
                    break
                pages_fetched += 1
                new_count = 0
                for r in rows:
                    key = (r.get("profile_id") or r.get("link") or (r.get("name") or "")).strip()
                    # skip malformed rows that have no id/link and no name
                    if not key or not r.get("name"):
                        continue
                    entry = players.setdefault(key, {
                        "id": key,
                        "name": r.get("name"),
                        "club": r.get("club"),
                        "regions_seen": [],
                        "region_by_year": {},
                        "points_by_year": {},
                        "elo_by_year": {},
                        "tournaments_by_year": {},
                        "last_seen_url_params": {}
                    })
                    norm_region = normalize_region(region)
                    if norm_region not in entry["regions_seen"]:
                        entry["regions_seen"].append(norm_region)
                    _add_region_for_year(entry, year, norm_region)
                    entry["points_by_year"][year] = r.get("points")
                    entry["elo_by_year"][year] = r.get("elo")
                    entry["tournaments_by_year"][year] = r.get("tournaments")
                    # Prefer club if not present
                    if not entry.get("club") and r.get("club"):
                        entry["club"] = r.get("club")
                    entry["last_seen_url_params"] = {"region": norm_region, "year": year, "page": page}
                    new_count += 1
                print(f"  Rows processed into players: {new_count}; total players so far: {len(players)}; pages fetched for this view: {pages_fetched}", flush=True)
                page += 1
                time.sleep(rate_limit)

    # write JSONL
    with open(out_jsonl, "w", encoding="utf-8") as f:
        for p in players.values():
            # skip any malformed canonical entries
            if not p.get("id") or not p.get("name"):
                continue
            f.write(json.dumps(p, ensure_ascii=False) + "\n")
    print("Saved", out_jsonl, flush=True)

    # write CSV: one row per player-year
    fieldnames = [
        "id", "name", "club", "year", "page", "region_for_year", "points", "elo", "tournaments",
        "regions_seen", "region_by_year_full", "last_seen_region", "last_seen_year", "last_seen_page"
    ]
    with open(out_csv, "w", encoding="utf-8", newline="") as cf:
        writer = csv.DictWriter(cf, fieldnames=fieldnames)
        writer.writeheader()
        for p in players.values():
            # skip malformed canonical entries
            if not p.get("id") or not p.get("name"):
                continue
            regions_seen_joined = "|".join(p.get("regions_seen", []))
            for year in YEARS:
                last_seen = p.get("last_seen_url_params", {})
                row = {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "club": p.get("club"),
                    "year": year,
                    "page": last_seen.get("page"),
                    "region_for_year": _region_for_csv(p["region_by_year"].get(year)),
                    "points": p["points_by_year"].get(year),
                    "elo": p["elo_by_year"].get(year),
                    "tournaments": p["tournaments_by_year"].get(year),
                    "regions_seen": regions_seen_joined,
                    "region_by_year_full": json.dumps(p.get("region_by_year", {}), ensure_ascii=False),
                    "last_seen_region": last_seen.get("region"),
                    "last_seen_year": last_seen.get("year"),
                    "last_seen_page": last_seen.get("page")
                }
                writer.writerow(row)
    print("Saved", out_csv, flush=True)


if __name__ == "__main__":
    rl = float(os.environ.get("RATE_LIMIT", RATE_LIMIT))
    save_html = os.environ.get("SAVE_FAILED_HTML", str(SAVE_FAILED_HTML)).lower() in ("1", "true", "yes")
    out_jsonl = os.environ.get("OUT_JSONL", OUT_JSONL)
    out_csv = os.environ.get("OUT_CSV", OUT_CSV)
    run(rate_limit=rl, save_failed_html=save_html, out_jsonl=out_jsonl, out_csv=out_csv)
