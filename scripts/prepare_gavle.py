"""Convert raw VD Pro Excel exports for Gävle into normalized CSVs.

Input:  a directory of `.xlsx` files (one sheet `Analys` each, 27 columns)
Output: data/gavle/{municipalities,brfs,properties,transactions}.csv

The output is shaped to match the schema in supabase/migrations/.
Run once. Re-running is safe (deterministic output, full overwrite).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

import openpyxl

SOURCE_NAME = "VD Pro"

HEADER = [
    None,
    "Kontraktsdatum", "Adress", "Kommun", "Bostadsrättsförening",
    "Slutpris (kr)", "Pris idag (kr)", "Månadsavg. (kr)",
    "Rum", "BOA (m2)", "Annonstid dagar",
    "Våning", "Våningar", "Hiss", "Balkong", "Värme",
    "Fastighet", "årsavg./KVM (kr)",
    "Utgångspris (kr)", "Budpremie (kr)", "Budpremie (%)",
    "Org.nummer", "Kr/kvm",
    "Publiceringsdatum", "Tillträdesdatum",
    "Bostadstyp", "Byggår", "Nyprod.",
]


def to_num(v: Any) -> float | None:
    if v is None or v == "-" or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.replace(" ", "").replace(" ", "").replace(",", ".")
        try:
            return float(s)
        except ValueError:
            return None
    return None


def to_int(v: Any) -> int | None:
    n = to_num(v)
    return int(n) if n is not None else None


def to_bool_yn(v: Any) -> bool | None:
    if v is None or v == "-" or v == "":
        return None
    s = str(v).strip().lower()
    if s in ("ja", "j", "yes", "true", "1"):
        return True
    if s in ("nej", "n", "no", "false", "0"):
        return False
    return None


def to_date(v: Any) -> str | None:
    if v is None or v == "-" or v == "":
        return None
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str):
        s = v.strip()
        if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            return s
    return None


def normalize_bostadstyp(v: str | None) -> str | None:
    if not v:
        return None
    m = {
        "Lägenhet": "lagenhet",
        "Kedje/par/radhus": "radhus",
        "Friliggande villa": "villa",
        "Fritidshus": "fritidshus",
        "Övrigt": "ovrigt",
    }
    return m.get(v.strip(), v.strip().lower())


def row_hash(adress: str, kontraktsdatum: str, slutpris: int | None,
             org_nummer: str | None) -> str:
    payload = f"{adress}|{kontraktsdatum}|{slutpris}|{org_nummer}".lower()
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def load_all(input_dir: Path) -> list[tuple]:
    files = sorted(p for p in input_dir.iterdir() if p.suffix == ".xlsx")
    if not files:
        sys.exit(f"No .xlsx files found in {input_dir}")
    rows: list[tuple] = []
    for f in files:
        wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
        ws = wb.active
        excel_rows = list(ws.iter_rows(values_only=True))
        if excel_rows[0] != tuple(HEADER):
            print(f"Warning: unexpected header in {f.name}", file=sys.stderr)
        for r in excel_rows[2:]:  # skip header + "Medelvärden"
            rows.append(r)
        wb.close()
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input", required=True,
        help="Directory containing raw .xlsx exports",
    )
    parser.add_argument(
        "--output", default="data/gavle",
        help="Output directory (default: data/gavle)",
    )
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    raw = load_all(input_dir)
    print(f"Loaded {len(raw):,} raw transaction rows from {input_dir}")

    # Dedupe
    seen: set[str] = set()
    transactions: list[dict] = []
    brfs: dict[str, dict] = {}
    properties: dict[tuple[str, str], dict] = {}
    municipalities: dict[str, dict] = {}

    for r in raw:
        kontraktsdatum = to_date(r[1])
        adress = (r[2] or "").strip()
        kommun = (r[3] or "").strip()
        brf_name = (r[4] or "").strip() or None
        slutpris = to_int(r[5])
        pris_idag = to_int(r[6])
        manadsavg = to_int(r[7])
        rum = to_num(r[8])
        boa = to_num(r[9])
        annonstid = to_int(r[10])
        vaning = to_int(r[11])
        vaningar = to_int(r[12])
        hiss = to_bool_yn(r[13])
        balkong = to_bool_yn(r[14])
        varme = to_bool_yn(r[15])  # "Värme" Ja/Nej (gemensam värme)
        fastighet = (r[16] or "").strip() or None
        arsavg_per_kvm = to_int(r[17])
        utgangspris = to_int(r[18])
        budpremie_kr = to_int(r[19])
        budpremie_pct = to_num(r[20])
        org_nummer = (r[21] or "").strip() or None
        kr_per_kvm = to_int(r[22])
        publiceringsdatum = to_date(r[23])
        tilltradesdatum = to_date(r[24])
        bostadstyp = normalize_bostadstyp(r[25])
        byggar = to_int(r[26])
        nyprod = to_bool_yn(r[27])

        if not kontraktsdatum or not adress or not kommun:
            continue

        h = row_hash(adress, kontraktsdatum, slutpris, org_nummer)
        if h in seen:
            continue
        seen.add(h)

        municipalities.setdefault(kommun, {"name": kommun})

        if org_nummer and org_nummer not in brfs:
            brfs[org_nummer] = {
                "org_nummer": org_nummer,
                "name": brf_name or "",
                "municipality_name": kommun,
            }

        prop_key = (kommun, fastighet) if fastighet else None
        if prop_key and prop_key not in properties:
            properties[prop_key] = {
                "fastighetsbeteckning": fastighet,
                "municipality_name": kommun,
                "brf_org_nummer": org_nummer,
            }

        transactions.append({
            "source_row_hash": h,
            "kontraktsdatum": kontraktsdatum,
            "publiceringsdatum": publiceringsdatum,
            "tilltradesdatum": tilltradesdatum,
            "municipality_name": kommun,
            "brf_org_nummer": org_nummer,
            "fastighetsbeteckning": fastighet,
            "adress": adress,
            "slutpris": slutpris,
            "utgangspris": utgangspris,
            "pris_idag": pris_idag,
            "kr_per_kvm": kr_per_kvm,
            "budpremie_kr": budpremie_kr,
            "budpremie_pct": budpremie_pct,
            "rum": rum,
            "boa_kvm": boa,
            "vaning": vaning,
            "vaningar": vaningar,
            "hiss": hiss,
            "balkong": balkong,
            "varme_gemensam": varme,
            "bostadstyp": bostadstyp,
            "byggar": byggar,
            "nyprod": nyprod,
            "manadsavg": manadsavg,
            "arsavg_per_kvm": arsavg_per_kvm,
            "annonstid_dagar": annonstid,
            "source_name": SOURCE_NAME,
        })

    write_csv(output_dir / "municipalities.csv", list(municipalities.values()),
              ["name"])
    write_csv(output_dir / "brfs.csv", list(brfs.values()),
              ["org_nummer", "name", "municipality_name"])
    write_csv(output_dir / "properties.csv", list(properties.values()),
              ["fastighetsbeteckning", "municipality_name", "brf_org_nummer"])
    write_csv(output_dir / "transactions.csv", transactions, [
        "source_row_hash", "kontraktsdatum", "publiceringsdatum",
        "tilltradesdatum", "municipality_name", "brf_org_nummer",
        "fastighetsbeteckning", "adress", "slutpris", "utgangspris",
        "pris_idag", "kr_per_kvm", "budpremie_kr", "budpremie_pct", "rum",
        "boa_kvm", "vaning", "vaningar", "hiss", "balkong", "varme_gemensam",
        "bostadstyp", "byggar", "nyprod", "manadsavg", "arsavg_per_kvm",
        "annonstid_dagar", "source_name",
    ])

    print(f"  → {len(municipalities):>5} municipalities")
    print(f"  → {len(brfs):>5} brfs")
    print(f"  → {len(properties):>5} properties")
    print(f"  → {len(transactions):>5} transactions")
    print(f"Output: {output_dir}/")


def write_csv(path: Path, rows: list[dict], cols: list[str]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r.get(k) is None else r[k]) for k in cols})


if __name__ == "__main__":
    main()
