import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "data" / "ai_sessions.json"
CSV_PATH = ROOT / "data" / "symposium_review.csv"


def normalize_text(value):
    return (value or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def main():
    sessions = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    by_id = {str(session["session_id"]): session for session in sessions["sessions"]}

    updated = 0
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            session_id = str(row.get("session_id", "")).strip()
            if not session_id or session_id not in by_id:
                continue
            citation = normalize_text(row.get("citation"))
            if citation:
                by_id[session_id]["citation"] = citation
                updated += 1

    sessions["sessions"] = list(by_id.values())
    sessions["count"] = len(sessions["sessions"])
    JSON_PATH.write_text(json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Updated {updated} symposium citations in {JSON_PATH}")


if __name__ == "__main__":
    main()
