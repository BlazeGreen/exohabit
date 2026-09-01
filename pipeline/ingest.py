"""
ingest.py — pull raw planetary + stellar parameters from the NASA Exoplanet
Archive, or fall back to a bundled snapshot so the app always builds.

Source table: `pscomppars` (Planetary Systems Composite Parameters) — one row
per confirmed planet, each column already populated with the best available
published value and its 1-sigma errors. TAP endpoint, ADQL query, JSON out.

Docs: https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse

import requests

TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

# (archive column, our key). Errors pulled where the model uses them.
COLUMNS = [
    ("pl_name", "pl_name"), ("hostname", "hostname"),
    ("sy_pnum", "sy_pnum"), ("sy_snum", "sy_snum"),
    ("discoverymethod", "discoverymethod"), ("disc_year", "disc_year"),
    ("pl_controv_flag", "pl_controv_flag"),
    ("pl_rade", "pl_rade"), ("pl_radeerr1", "pl_radeerr1"), ("pl_radeerr2", "pl_radeerr2"),
    ("pl_bmasse", "pl_bmasse"), ("pl_bmasseerr1", "pl_bmasseerr1"),
    ("pl_bmasseerr2", "pl_bmasseerr2"), ("pl_bmassprov", "pl_bmassprov"),
    ("pl_dens", "pl_dens"),
    ("pl_orbsmax", "pl_orbsmax"), ("pl_orbsmaxerr1", "pl_orbsmaxerr1"),
    ("pl_orbper", "pl_orbper"),
    ("pl_orbeccen", "pl_orbeccen"),
    ("pl_insol", "pl_insol"), ("pl_insolerr1", "pl_insolerr1"),
    ("pl_eqt", "pl_eqt"), ("pl_eqterr1", "pl_eqterr1"),
    ("st_teff", "st_teff"), ("st_tefferr1", "st_tefferr1"),
    ("st_rad", "st_rad"), ("st_raderr1", "st_raderr1"),
    ("st_mass", "st_mass"),
    ("st_lum", "st_lum"),
    ("st_met", "st_met"), ("st_age", "st_age"),
    ("st_spectype", "st_spectype"),
    ("sy_dist", "sy_dist"), ("sy_disterr1", "sy_disterr1"),
    ("ra", "ra"), ("dec", "dec"),
    # observability (Kempton et al. 2018 TSM / ESM)
    ("tran_flag", "tran_flag"),
    ("sy_jmag", "sy_jmag"), ("sy_kmag", "sy_kmag"),
    ("pl_trandep", "pl_trandep"), ("pl_trandur", "pl_trandur"),
]

DEMO_PATH = os.path.join(os.path.dirname(__file__), "demo_snapshot.json")
RAW_OUT = os.path.join(os.path.dirname(__file__), "..", "data", "planets.raw.json")


def _query() -> str:
    cols = ",".join(c[0] for c in COLUMNS)
    # default_flag not needed for pscomppars (already composite). Exclude rows
    # with no radius AND no mass — the model has nothing to work with.
    return (f"select {cols} from pscomppars "
            f"where pl_rade is not null or pl_bmasse is not null")


def fetch_live(timeout: int = 120, retries: int = 3) -> list[dict]:
    q = urllib.parse.urlencode({"query": _query(), "format": "json"})
    url = f"{TAP_URL}?{q}"
    last = None
    for attempt in range(1, retries + 1):
        try:
            print(f"  [ingest] TAP request attempt {attempt}/{retries} ...", flush=True)
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            rows = r.json()
            if not isinstance(rows, list) or not rows:
                raise ValueError("empty / unexpected TAP response")
            print(f"  [ingest] received {len(rows)} rows", flush=True)
            return rows
        except Exception as e:  # noqa: BLE001 - want to catch and retry anything
            last = e
            print(f"  [ingest] attempt {attempt} failed: {e}", flush=True)
            time.sleep(2 * attempt)
    raise RuntimeError(f"live ingest failed after {retries} attempts: {last}")


def load_demo() -> list[dict]:
    with open(DEMO_PATH) as f:
        rows = json.load(f)
    print(f"  [ingest] DEMO MODE — {len(rows)} bundled planets", flush=True)
    return rows


def run(force_demo: bool = False) -> dict:
    os.makedirs(os.path.dirname(RAW_OUT), exist_ok=True)
    mode = "demo"
    try:
        rows = load_demo() if force_demo else fetch_live()
        mode = "demo" if force_demo else "live"
    except Exception as e:  # noqa: BLE001
        print(f"  [ingest] live ingest unavailable ({e}); using bundled snapshot", flush=True)
        rows = load_demo()
        mode = "demo-fallback"

    payload = {
        "source": "NASA Exoplanet Archive — pscomppars (TAP)",
        "mode": mode,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "n_rows": len(rows),
        "rows": rows,
    }
    with open(RAW_OUT, "w") as f:
        json.dump(payload, f)
    print(f"  [ingest] wrote {RAW_OUT}  (mode={mode}, {len(rows)} rows)", flush=True)
    return payload


if __name__ == "__main__":
    run(force_demo="--demo" in sys.argv)
