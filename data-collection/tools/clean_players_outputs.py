# data-collection/tools/clean_players_outputs.py
import json
from pathlib import Path

IN_JSONL = Path("data-collection/tools/players_by_rating.jsonl")
OUT_JSONL = Path("data-collection/tools/players_by_rating.cleaned.jsonl")
OUT_CSV = Path("data-collection/tools/players_by_rating.cleaned.csv")
YEARS = ["2022", "2023", "2024", "2025"]

if not IN_JSONL.exists():
    print(f"Input JSONL not found: {IN_JSONL}")
    raise SystemExit(1)

players = []
with IN_JSONL.open("r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception as e:
            print(f"Skipping invalid json on line {i}: {e}")
            continue
        # require id and name
        if not obj.get("id") or not obj.get("name"):
            continue
        players.append(obj)

print(f"Loaded {len(players)} valid player entries")

# write cleaned JSONL
with OUT_JSONL.open("w", encoding="utf-8") as f:
    for p in players:
        f.write(json.dumps(p, ensure_ascii=False) + "\n")
print(f"Wrote cleaned JSONL: {OUT_JSONL}")

# write compact CSV rows
import csv
with OUT_CSV.open("w", encoding="utf-8", newline="") as cf:
    writer = csv.DictWriter(cf, fieldnames=["id", "name", "year", "tournaments", "points"])
    writer.writeheader()
    rows_written = 0
    for p in players:
        pid = p.get("id")
        name = p.get("name")
        points_by_year = p.get("points_by_year", {}) or {}
        tournaments_by_year = p.get("tournaments_by_year", {}) or {}
        for y in YEARS:
            pts = points_by_year.get(y)
            t = tournaments_by_year.get(y)
            # write only when both present and not None
            if pts is None or t is None:
                continue
            writer.writerow({"id": pid, "name": name, "year": y, "tournaments": t, "points": pts})
            rows_written += 1

print(f"Wrote compact CSV with {rows_written} rows: {OUT_CSV}")

