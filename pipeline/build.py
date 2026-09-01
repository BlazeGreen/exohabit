"""
build.py — end-to-end pipeline entry point.

  NASA Exoplanet Archive (or bundled snapshot)
      -> ingest        (pipeline/ingest.py)
      -> normalize + provenance + physics   (pipeline/features.py)
      -> Habitability Potential assessment  (pipeline/scoring.py)
      -> data/planets.json   (full records, one per planet, assessment embedded)
         data/index.json     (slim rows for list/table/filter views)
         data/meta.json      (build + model metadata, dimension docs)

Safe to re-run. One malformed record is skipped and logged, never fatal.

Usage:
  python pipeline/build.py            # live NASA pull, fall back to snapshot
  python pipeline/build.py --demo     # force the bundled snapshot
"""

from __future__ import annotations

import json
import os
import sys
import time
import traceback

import ingest
import scoring
from features import build_record

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

DIMENSION_DOCS = {
    "temperature_suitability":
        "Equilibrium-temperature match to the 255-288 K range where surface "
        "liquid water is plausible with a modest atmosphere.",
    "habitable_zone_position":
        "Position relative to the Kopparapu et al. (2014) conservative and "
        "optimistic habitable zone for the host star's temperature.",
    "planet_properties":
        "Likelihood of being a rocky world able to retain a temperate "
        "atmosphere, from radius and (where known) bulk density.",
    "stellar_environment":
        "Host-star suitability: main-sequence lifetime, spectral type, "
        "activity proxy and age.",
    "orbital_characteristics":
        "Orbital eccentricity as a proxy for the stability of insolation "
        "over an orbit.",
    "evidence_completeness":
        "Fraction of the model's key inputs that are directly observed rather "
        "than modelled or missing.",
}


def main(force_demo: bool = False) -> None:
    t0 = time.time()
    os.makedirs(DATA_DIR, exist_ok=True)
    raw = ingest.run(force_demo=force_demo)

    planets, skipped = [], 0
    for row in raw["rows"]:
        try:
            built = build_record(row)
            if built is None:
                skipped += 1
                continue
            built["planet"]["assessment"] = scoring.assess(built["derived"])
            planets.append(built["planet"])
        except Exception as e:  # noqa: BLE001
            skipped += 1
            print(f"  [build] skipped {row.get('pl_name', '?')}: {e}")
            traceback.print_exc()

    planets.sort(key=lambda p: p["assessment"]["score"], reverse=True)
    for rank, p in enumerate(planets, 1):
        p["assessment"]["rank"] = rank

    index = [{
        "id": p["id"], "name": p["name"], "hostname": p["hostname"],
        "score": p["assessment"]["score"], "band": p["assessment"]["band"],
        "confidence": p["assessment"]["confidence"]["value"],
        "confidence_label": p["assessment"]["confidence"]["label"],
        "rank": p["assessment"]["rank"],
        "esi": p["assessment"]["earth_similarity_index"],
        "radius_earth": p["fields"]["radius_earth"]["value"],
        "mass_earth": p["fields"]["mass_earth"]["value"],
        "eq_temp_k": p["fields"]["eq_temp_k"]["value"],
        "insolation_searth": p["fields"]["insolation_searth"]["value"],
        "distance_pc": p["system"]["distance_pc"],
        "st_teff": p["star"]["teff_k"],
        "spectype": p["star"]["spectype"],
        "disc_year": p["discovery"]["year"],
        "in_conservative_hz": bool(p["hz_position"] and p["hz_position"]["in_conservative"]),
        "in_optimistic_hz": bool(p["hz_position"] and p["hz_position"]["in_optimistic"]),
        "mass_modelled": p["fields"]["mass_earth"]["provenance"] == "modelled",
        "transiting": p["observability"]["transiting"],
        "tsm": p["observability"]["tsm"],
        "esm": p["observability"]["esm"],
        "tsm_tier": p["observability"]["tsm_tier"],
        "st_jmag": p["observability"]["st_jmag"],
    } for p in planets]

    meta = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ingest_mode": raw["mode"],
        "source": raw["source"],
        "fetched_at": raw["fetched_at"],
        "n_planets": len(planets),
        "n_skipped": skipped,
        "model_version": scoring.CONFIG["model_version"],
        "weights": scoring.CONFIG["weights"],
        "assumptions": scoring.CONFIG["assumptions"],
        "bands": scoring.CONFIG["bands"],
        "dimension_docs": DIMENSION_DOCS,
        "build_seconds": round(time.time() - t0, 1),
    }

    _write("planets.json", planets)   # full set, for build-time static generation
    _write("index.json", index)       # slim rows, shipped to the explorer/rankings
    _write("meta.json", meta)

    # one file per planet, for on-demand client fetches (detail, compare)
    pdir = os.path.join(DATA_DIR, "planets")
    os.makedirs(pdir, exist_ok=True)
    for old in os.listdir(pdir):
        if old.endswith(".json"):
            os.remove(os.path.join(pdir, old))
    for p in planets:
        with open(os.path.join(pdir, f"{p['id']}.json"), "w") as f:
            json.dump(p, f, separators=(",", ":"))
    print(f"  [build] wrote data/planets/*.json  ({len(planets)} files)")

    _high_min = next((b["min"] for b in scoring.CONFIG["bands"]["score"]
                      if "HIGH" in b["label"]), 80)
    hi = sum(1 for p in index if p["score"] >= _high_min)
    print(f"\n  [build] {len(planets)} planets  |  {skipped} skipped  |  "
          f"{hi} high-potential  |  mode={raw['mode']}  |  {meta['build_seconds']}s")
    print(f"  [build] top 5: " + ", ".join(
        f"{p['name']} ({p['score']})" for p in index[:5]))


def _write(name: str, obj) -> None:
    path = os.path.join(DATA_DIR, name)
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    kb = os.path.getsize(path) / 1024
    print(f"  [build] wrote data/{name}  ({kb:.0f} KB)")


if __name__ == "__main__":
    main(force_demo="--demo" in sys.argv)
