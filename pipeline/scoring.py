"""
scoring.py — Habitability Potential model (physics-informed, transparent).

The score is a weighted sum of six bounded sub-scores:

    HP = 100 * sum_i ( weight_i * subscore_i )        subscore_i in [0, 1]

Because the model is linear in the sub-scores, explainability is *exact*, not
approximated: the contribution of dimension i is  weight_i * subscore_i * 100,
and its push relative to a neutral planet is  weight_i * (subscore_i - 0.5) * 100.
No trained black box, no SHAP approximation — the waterfall below is the model.

Confidence is reported SEPARATELY from the score. A planet can have a high
potential score with low confidence (few measured inputs, wide error bars, many
values modelled rather than observed).

None of these weights or shaping curves are established science. They are an
explicit, editable editorial choice defined in scoring_config.json.
"""

from __future__ import annotations

import json
import math
import os
from typing import Optional

from physics import (
    earth_similarity_index,
    equilibrium_temp_k,
)

Num = Optional[float]
_CFG_PATH = os.path.join(os.path.dirname(__file__), "scoring_config.json")
with open(_CFG_PATH) as _f:
    CONFIG = json.load(_f)


# --- shaping helpers ----------------------------------------------------
def _gauss(x: float, mu: float, sigma: float) -> float:
    return math.exp(-0.5 * ((x - mu) / sigma) ** 2)


def _plateau(x: float, lo: float, hi: float, soft: float) -> float:
    """1.0 inside [lo, hi], Gaussian roll-off with scale `soft` outside."""
    if x < lo:
        return _gauss(x, lo, soft)
    if x > hi:
        return _gauss(x, hi, soft)
    return 1.0


def band(value: float, table: list[dict]) -> str:
    for row in table:
        if value >= row["min"]:
            return row["label"]
    return table[-1]["label"]


# --- individual dimensions -------------------------------------------------
def sub_temperature(eq_temp_k: Num) -> Optional[dict]:
    """Equilibrium-temperature suitability for surface liquid water.

    Peak credit 255-288 K (Earth's equilibrium and surface temperatures).
    Roll off to ~0 by 190 K (cold edge, thick-atmosphere worlds still possible
    but marginal) and ~330 K (hot edge, runaway-greenhouse risk).
    """
    if eq_temp_k is None:
        return None
    s = _plateau(eq_temp_k, 255.0, 288.0, 32.0)
    return {"subscore": round(s, 4), "basis": {"eq_temp_k": round(eq_temp_k, 1)}}


def sub_hz(hz: Optional[dict]) -> Optional[dict]:
    """Habitable-zone position (Kopparapu 2014).

    1.00  inside conservative HZ (mild bonus for the middle of the zone)
    0.55  inside optimistic HZ only
    0.10  just outside optimistic HZ
    0.00  far too hot / far too cold
    """
    if hz is None:
        return None
    if hz["in_conservative"]:
        mid = 1.0 - abs((hz["frac"] or 0.5) - 0.5)  # 0.5..1.0
        s = 0.85 + 0.15 * (2 * mid - 1)
    elif hz["in_optimistic"]:
        s = 0.55
    elif hz["zone"] in ("too-hot", "too-cold"):
        s = 0.05
    else:
        s = 0.25
    return {"subscore": round(min(1.0, max(0.0, s)), 4),
            "basis": {"zone": hz["zone"], "frac": hz["frac"]}}


def sub_planet(radius_earth: Num, density_gcc_val: Num, mass_modelled: bool) -> Optional[dict]:
    """Is this plausibly a rocky world that can hold a temperate atmosphere?

    Radius: plateau 0.8-1.4 Rearth, roll-off; hard fade above ~1.8 Rearth
    (increasingly likely to be a gas/volatile envelope, Fulton gap ~1.5-2.0).
    Density: bonus for 4-8 g/cc (rocky), penalty for < 3 (volatile-rich).
    """
    if radius_earth is None:
        return None
    s_r = _plateau(radius_earth, 0.8, 1.4, 0.45)
    if radius_earth > 1.8:
        s_r *= _gauss(radius_earth, 1.8, 0.6)
    s = s_r
    basis = {"radius_earth": round(radius_earth, 2)}
    if density_gcc_val is not None:
        s_d = _plateau(density_gcc_val, 4.0, 8.0, 2.5)
        s = 0.65 * s_r + 0.35 * s_d
        basis["density_gcc"] = round(density_gcc_val, 2)
        basis["density_modelled"] = mass_modelled
    return {"subscore": round(min(1.0, max(0.0, s)), 4), "basis": basis}


def sub_star(st_teff: Num, st_spectype: Optional[str], st_age_gyr: Num) -> Optional[dict]:
    """Host-star environment.

    Favours F-late / G / K / early-M (long-lived, stable). Penalties:
      Teff > 6500 K : short main-sequence lifetime, strong UV
      Teff < 3200 K : frequent flares, tight HZ, likely tidal locking
      age  < 1 Gyr  : little time for surface stability (mild)
    """
    if st_teff is None:
        return None
    s = _plateau(st_teff, 4200.0, 6000.0, 1400.0)
    if st_teff > 6500.0:
        s *= 0.6
    if st_teff < 3200.0:
        s *= 0.55
    basis = {"st_teff": round(st_teff, 0)}
    if st_spectype:
        basis["spectype"] = st_spectype
    if st_age_gyr is not None:
        if st_age_gyr < 1.0:
            s *= 0.8
        basis["age_gyr"] = round(st_age_gyr, 1)
    return {"subscore": round(min(1.0, max(0.0, s)), 4), "basis": basis}


def sub_orbit(eccentricity: Num) -> Optional[dict]:
    """Orbital characteristics. Low eccentricity -> stable insolation over a year.

    e <= 0.1 : ~full credit
    e  = 0.3 : ~0.5
    e >= 0.6 : large seasonal flux swings, ~0.1
    """
    if eccentricity is None:
        return None
    s = math.exp(-((eccentricity / 0.28) ** 2))
    return {"subscore": round(min(1.0, max(0.05, s)), 4),
            "basis": {"eccentricity": round(eccentricity, 3)}}


def sub_evidence(provenance: dict) -> dict:
    """Evidence completeness: fraction of the model's key inputs that are
    OBSERVED (from the archive) rather than MODELLED or UNKNOWN.

    This is BOTH a scored dimension (rewards well-characterised targets) and the
    backbone of the confidence estimate.
    """
    key_fields = ["radius_earth", "mass_earth", "semi_major_au", "eccentricity",
                  "insolation_searth", "eq_temp_k", "st_teff", "st_rad", "st_lum"]
    weights = {"observed": 1.0, "derived": 0.8, "modelled": 0.4, "unknown": 0.0}
    got = sum(weights.get(provenance.get(f, "unknown"), 0.0) for f in key_fields)
    frac = got / len(key_fields)
    return {"subscore": round(frac, 4),
            "basis": {"n_fields": len(key_fields),
                      "n_observed": sum(1 for f in key_fields
                                        if provenance.get(f) == "observed")}}


# --- confidence ---------------------------------------------------------
def confidence(provenance: dict, rel_errors: dict, hz_teff_clamped: bool) -> dict:
    """0..1 confidence in the assessment (NOT the score itself).

    Blends: evidence completeness (60%), measurement precision from archive
    error bars (30%), and a penalty if the star's Teff was outside the
    Kopparapu calibration range (10%).
    """
    ev = sub_evidence(provenance)["subscore"]
    if rel_errors:
        prec = sum(max(0.0, 1.0 - min(1.0, e / 0.5)) for e in rel_errors.values()) / len(rel_errors)
    else:
        prec = 0.4
    clamp_pen = 0.0 if not hz_teff_clamped else 1.0
    c = 0.6 * ev + 0.3 * prec + 0.1 * (1.0 - clamp_pen)
    c = max(0.0, min(1.0, c))
    return {"value": round(c, 4), "label": band(c, CONFIG["bands"]["confidence"]),
            "inputs": {"evidence": round(ev, 3), "precision": round(prec, 3),
                       "teff_extrapolated": hz_teff_clamped}}


# --- top-level assessment --------------------------------------------------
def assess(derived: dict) -> dict:
    """Combine everything into the published assessment for one planet.

    `derived` is the record produced by features.build_features(): normalized
    observed values + physics derivations + a `provenance` map + `rel_errors`.
    """
    ref = CONFIG["assumptions"]["esi_reference"]
    w = CONFIG["weights"]
    neutral = CONFIG["neutral_subscore"]

    hz = derived.get("hz_position")
    dims = {
        "temperature_suitability": sub_temperature(derived.get("eq_temp_k")),
        "habitable_zone_position": sub_hz(hz),
        "planet_properties": sub_planet(derived.get("radius_earth"),
                                        derived.get("density_gcc"),
                                        derived["provenance"].get("mass_earth") == "modelled"),
        "stellar_environment": sub_star(derived.get("st_teff"),
                                        derived.get("st_spectype"),
                                        derived.get("st_age_gyr")),
        "orbital_characteristics": sub_orbit(derived.get("eccentricity")),
        "evidence_completeness": sub_evidence(derived["provenance"]),
    }

    # Missing dimension -> fall back to the neutral sub-score so one unknown
    # doesn't zero the planet, but record it as an imputation.
    contributions, total, imputed = [], 0.0, []
    for name, res in dims.items():
        s = res["subscore"] if res else neutral
        if res is None:
            imputed.append(name)
        contrib = w[name] * s * CONFIG["score_scale"]
        push = w[name] * (s - neutral) * CONFIG["score_scale"]
        total += contrib
        contributions.append({
            "dimension": name,
            "subscore": round(s, 4),
            "weight": w[name],
            "contribution": round(contrib, 2),   # absolute points added
            "push": round(push, 2),              # +/- vs a neutral planet
            "imputed": res is None,
            "basis": (res or {}).get("basis", {}),
        })

    base_score = max(0.0, min(100.0, total))
    gate = viability_gate(derived.get("eq_temp_k"), derived.get("radius_earth"))
    score = round(base_score * gate["value"], 1)
    contributions.sort(key=lambda c: c["push"], reverse=True)

    esi = earth_similarity_index(
        derived.get("radius_earth"), derived.get("density_gcc"),
        derived.get("escape_velocity_kms"),
        derived.get("surface_temp_k") or derived.get("eq_temp_k"), ref)

    conf = confidence(derived["provenance"], derived.get("rel_errors", {}),
                      bool(hz and hz.get("teff_clamped")))

    lims = _limitations(derived, imputed)
    if gate["value"] < 0.85 and gate["reasons"]:
        lims.insert(0, "Physical viability gate applied (base "
                    f"{round(base_score, 1)} -> {score}): " + "; ".join(gate["reasons"]) + ".")

    return {
        "model_version": CONFIG["model_version"],
        "score": score,
        "base_score": round(base_score, 1),
        "viability_gate": gate,
        "band": band(score, CONFIG["bands"]["score"]),
        "confidence": conf,
        "earth_similarity_index": None if esi is None else round(esi["esi"], 4),
        "esi_detail": esi,
        "contributions": contributions,
        "imputed_dimensions": imputed,
        "limitations": lims,
    }


def viability_gate(eq_temp_k: Num, radius_earth: Num) -> dict:
    """Physical showstopper gate applied AFTER the weighted sum.

    The six dimensions produce a *base* potential. This gate scales it down when
    a hard physical showstopper is present, because no amount of good ancillary
    data (orbit, distance, well-measured star) makes such a world a habitability
    target:

      temperature : full credit for T_eq in [200, 320] K, ramping to a 0.10
                    floor by ~120 K (frozen) and ~430 K (runaway greenhouse).
      radius      : full credit below 1.6 R_earth, ramping to a 0.15 floor by
                    3.0 R_earth (the world is almost certainly a gas/volatile
                    envelope with no accessible surface).

    gate = min(temperature, radius), clamped to [0.10, 1.0]. Reported explicitly
    so the UI can show "base 76 -> gated 30" with the reason.
    """
    def ramp(x, full_lo, full_hi, zero_lo, zero_hi, floor):
        if x is None:
            return 1.0
        if full_lo <= x <= full_hi:
            return 1.0
        if x < full_lo:
            t = (x - zero_lo) / (full_lo - zero_lo)
        else:
            t = (zero_hi - x) / (zero_hi - full_hi)
        return max(floor, min(1.0, floor + (1.0 - floor) * t))

    g_t = ramp(eq_temp_k, 200.0, 320.0, 120.0, 430.0, 0.10)
    g_r = ramp(radius_earth, 0.0, 1.6, 0.0, 3.0, 0.15) if radius_earth is not None else 1.0
    g = max(0.10, min(1.0, min(g_t, g_r)))
    reasons = []
    if g_t < 0.9:
        reasons.append(f"equilibrium temperature {eq_temp_k:.0f} K is outside the "
                       f"200-320 K liquid-water range")
    if g_r < 0.9:
        reasons.append(f"radius {radius_earth:.1f} R_earth is in the sub-Neptune / "
                       f"gaseous regime (likely no accessible surface)")
    return {"value": round(g, 4), "temperature_component": round(g_t, 4),
            "radius_component": round(g_r, 4), "reasons": reasons}


def _limitations(derived: dict, imputed: list[str]) -> list[str]:
    out = ["Atmospheric composition is unknown; surface greenhouse warming is "
           "not modelled (equilibrium temperature is used, not surface temperature)."]
    p = derived["provenance"]
    if p.get("mass_earth") == "modelled":
        out.append("Planet mass is estimated from radius (mass-radius relation), "
                   "not measured; density and escape velocity inherit that uncertainty.")
    if p.get("eq_temp_k") in ("derived", "modelled") and p.get("insolation_searth") != "observed":
        out.append("Equilibrium temperature is derived from stellar and orbital "
                   "parameters, not from thermal-emission observations.")
    if derived.get("eccentricity") is None:
        out.append("Orbital eccentricity is unavailable; assumed near-circular for scoring.")
    if not derived.get("st_age_gyr"):
        out.append("Stellar age is unavailable; long-term stellar activity history is unconstrained.")
    if imputed:
        out.append("Insufficient data for: " + ", ".join(s.replace("_", " ") for s in imputed)
                   + " (neutral value substituted).")
    return out
