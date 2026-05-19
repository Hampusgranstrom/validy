"""Upload prepared CSVs into Supabase via the PostgREST API.

Usage:
    export SUPABASE_URL="https://<project>.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="..."
    python scripts/upload_to_supabase.py --data-dir data/gavle

Idempotent: uses upsert on the natural keys (org_nummer, source_row_hash, ...).
Run order matters (parents before children), the script handles it.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from pathlib import Path
from typing import Any, Iterable

import urllib.error
import urllib.request
import json


def env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        sys.exit(f"Missing env: {name}")
    return v


def to_jsonable(v: str) -> Any:
    """CSV values come back as strings; convert empties and obvious types."""
    if v == "":
        return None
    if v in ("True", "true"):
        return True
    if v in ("False", "false"):
        return False
    return v


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return [
            {k: to_jsonable(val) for k, val in row.items()}
            for row in csv.DictReader(f)
        ]


def request(method: str, url: str, headers: dict,
            body: Any | None = None) -> Any:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            if 500 <= e.code < 600 and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"HTTP {e.code} on {method} {url}: {err_body}")
        except urllib.error.URLError as e:
            if attempt < 4:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"Network error on {method} {url}: {e}")
    return {}


def post(url: str, headers: dict, body: list[dict]) -> Any:
    return request("POST", url, headers, body)


def get(url: str, headers: dict) -> list[dict]:
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def chunk(seq: list, n: int) -> Iterable[list]:
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def upsert(url_base: str, headers: dict, table: str, rows: list[dict],
           on_conflict: str | None = None, batch: int = 500) -> None:
    if not rows:
        print(f"  {table}: (no rows)")
        return
    url = f"{url_base}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    h = {**headers, "Prefer": "resolution=merge-duplicates,return=minimal"}
    n = 0
    for c in chunk(rows, batch):
        post(url, h, c)
        n += len(c)
        print(f"  {table}: {n}/{len(rows)}", end="\r")
    print(f"  {table}: {n}/{len(rows)} ✓")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="data/gavle")
    args = p.parse_args()

    base = env("SUPABASE_URL").rstrip("/")
    key  = env("SUPABASE_SERVICE_ROLE_KEY")
    data_dir = Path(args.data_dir)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    # Load CSVs
    municipalities = read_csv(data_dir / "municipalities.csv")
    brfs_csv       = read_csv(data_dir / "brfs.csv")
    properties_csv = read_csv(data_dir / "properties.csv")
    txs_csv        = read_csv(data_dir / "transactions.csv")

    # --- Resolve foreign keys client-side ---------------------------------
    # municipalities by name
    mun_url = f"{base}/rest/v1/municipalities?select=id,name"
    municipalities_db = get(mun_url, headers)
    mun_by_name = {m["name"]: m["id"] for m in municipalities_db}

    # Insert any new municipalities from data not in the seed
    new_muns = [m for m in municipalities if m["name"] not in mun_by_name]
    if new_muns:
        upsert(base, headers, "municipalities", new_muns, on_conflict="name")
        municipalities_db = get(mun_url, headers)
        mun_by_name = {m["name"]: m["id"] for m in municipalities_db}

    # data_sources lookup
    ds = get(f"{base}/rest/v1/data_sources?select=id,code", headers)
    ds_by_code = {d["code"]: d["id"] for d in ds}

    # --- BRFs --------------------------------------------------------------
    brfs_rows = []
    for b in brfs_csv:
        kommun = b.pop("municipality_name", None)
        mid = mun_by_name.get(kommun)
        if not mid:
            print(f"  skip BRF — unknown kommun {kommun!r}: {b}")
            continue
        brfs_rows.append({**b, "municipality_id": mid})
    upsert(base, headers, "brfs", brfs_rows, on_conflict="org_nummer")

    # --- Properties --------------------------------------------------------
    prop_rows = []
    for p in properties_csv:
        kommun = p.pop("municipality_name", None)
        mid = mun_by_name.get(kommun)
        if not mid:
            continue
        prop_rows.append({**p, "municipality_id": mid})
    upsert(base, headers, "properties", prop_rows,
           on_conflict="municipality_id,fastighetsbeteckning")

    # Build property lookup (we need property_id per transaction)
    prop_lookup: dict[tuple[int, str], int] = {}
    page = 0
    page_size = 1000
    while True:
        rng_h = {**headers, "Range-Unit": "items",
                 "Range": f"{page*page_size}-{(page+1)*page_size-1}"}
        rows = get(
            f"{base}/rest/v1/properties?select=id,municipality_id,fastighetsbeteckning",
            rng_h)
        if not rows:
            break
        for r in rows:
            prop_lookup[(r["municipality_id"], r["fastighetsbeteckning"])] = r["id"]
        if len(rows) < page_size:
            break
        page += 1

    # --- Transactions ------------------------------------------------------
    vd_pro_id = ds_by_code.get("vd_pro")
    if vd_pro_id is None:
        sys.exit("data_sources.vd_pro missing — run migration 9 first.")

    # Track import batch
    import_resp = post(
        f"{base}/rest/v1/imports",
        {**headers, "Prefer": "return=representation"},
        [{
            "source_id": vd_pro_id,
            "file_name": str(data_dir),
            "notes": "Gävle initial bulk import",
        }],
    )
    import_id = import_resp[0]["id"] if import_resp else None

    tx_rows = []
    for t in txs_csv:
        kommun = t.pop("municipality_name", None)
        mid = mun_by_name.get(kommun)
        if not mid:
            continue
        fastighet = t.pop("fastighetsbeteckning", None)
        prop_id = prop_lookup.get((mid, fastighet)) if fastighet else None
        t.pop("source_name", None)
        tx_rows.append({
            **t,
            "municipality_id": mid,
            "property_id": prop_id,
            "source_id": vd_pro_id,
            "import_id": import_id,
        })

    upsert(base, headers, "transactions", tx_rows,
           on_conflict="source_id,source_row_hash", batch=300)

    # Close import
    from datetime import datetime, timezone
    finished_at = datetime.now(timezone.utc).isoformat()
    request("PATCH",
            f"{base}/rest/v1/imports?id=eq.{import_id}",
            {**headers, "Prefer": "return=minimal"},
            {"finished_at": finished_at, "row_count": len(tx_rows)})

    print("\nDone.")


if __name__ == "__main__":
    main()
