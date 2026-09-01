"""
features.py — turn one raw archive row into a normalized, provenance-tagged
record ready for scoring and for the UI.

Provenance vocabulary (shown verbatim in the product):
  observed  — value taken directly from the NASA Exoplanet Archive
  derived   — computed from observed values via a stated physical equation
  modelled  — estimated from a statistical relation (e.g. mass from radius)
  unknown   — not available; propagated as null, never invented
"""

from __future__ import annotations

import math
import re
from typing import Optional

import physics as phys

Num = Optional[float]


def _f(row: dict, key: str) -> Num:
    v = row.get(key)
    if v is None:
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _field(value: Num, provenance: str, unit: str, err: Num = None,
           note: str = "") -> dict:
    return {"value": None if value is None else round(value, 6),
            "provenance": provenance if value is not None else "unknown",
            "unit": unit,
            "err": None if err in (None, 0) else round(abs(err), 6),
            "note": note}


def build_record(row: dict) -> Optional[dict]:
    name = row.get("pl_name")
    if not name:
        return None

    # --- observed planet params ---
    radius = _f(row, "pl_rade")
    mass = _f(row, "pl_bmasse")
    mass_prov_src = (row.get("pl_bmassprov") or "").strip()
    a_au = _f(row, "pl_orbsmax")
    period = _f(row, "pl_orbper")
    ecc = _f(row, "pl_orbeccen")
    insol = _f(row, "pl_insol")
    eqt_obs = _f(row, "pl_eqt")
    dens_obs = _f(row, "pl_dens")

    # --- observed stellar params ---
    st_teff = _f(row, "st_teff")
    st_rad = _f(row, "st_rad")
    st_mass = _f(row, "st_mass")
    st_lum_log = _f(row, "st_lum")          # archive stores log10(L/Lsun)
    st_met = _f(row, "st_met")
    st_age = _f(row, "st_age")
    st_spectype = (row.get("st_spectype") or "").strip() or None
    dist_pc = _f(row, "sy_dist")

    prov: dict[str, str] = {}
    fields: dict[str, dict] = {}

    fields["radius_earth"] = _field(radius, "observed", "R_earth", _f(row, "pl_radeerr1"))
    prov["radius_earth"] = fields["radius_earth"]["provenance"]

    # mass: observed, else modelled from radius
    mass_note = ""
    if mass is not None:
        mass_prov = "observed"
        mass_err = _f(row, "pl_bmasseerr1")
        if "msini" in mass_prov_src.lower():
            mass_note = "archive value is M*sin(i) (radial-velocity minimum mass)"
    elif radius is not None:
        est = phys.mass_from_radius_earth(radius)
        mass, mass_note = est[0], est[1]
        mass_prov, mass_err = "modelled", None
    else:
        mass_prov, mass_err = "unknown", None
    fields["mass_earth"] = _field(mass, mass_prov, "M_earth", mass_err, mass_note)
    prov["mass_earth"] = fields["mass_earth"]["provenance"]

    fields["semi_major_au"] = _field(a_au, "observed", "AU", _f(row, "pl_orbsmaxerr1"))
    fields["period_days"] = _field(period, "observed", "days")
    fields["eccentricity"] = _field(ecc, "observed", "")
    for k in ("semi_major_au", "period_days", "eccentricity"):
        prov[k] = fields[k]["provenance"]

    # stellar luminosity: observed (de-logged) else derived
    if st_lum_log is not None:
        lum = 10 ** st_lum_log
        lum_prov, lum_note = "observed", "de-logged from archive st_lum = log10(L/Lsun)"
    else:
        lum = phys.stellar_luminosity_lsun(st_teff, st_rad)
        lum_prov = "derived" if lum is not None else "unknown"
        lum_note = "L = (R/Rsun)^2 (Teff/Tsun)^4" if lum is not None else ""
    fields["st_lum"] = _field(lum, lum_prov, "L_sun", note=lum_note)
    prov["st_lum"] = fields["st_lum"]["provenance"]

    fields["st_teff"] = _field(st_teff, "observed", "K", _f(row, "st_tefferr1"))
    fields["st_rad"] = _field(st_rad, "observed", "R_sun", _f(row, "st_raderr1"))
    fields["st_mass"] = _field(st_mass, "observed", "M_sun")
    fields["st_metallicity"] = _field(st_met, "observed", "dex")
    fields["st_age_gyr"] = _field(st_age, "observed", "Gyr")
    fields["distance_pc"] = _field(dist_pc, "observed", "pc", _f(row, "sy_disterr1"))
    for k in ("st_teff", "st_rad", "st_mass", "st_age_gyr"):
        prov[k] = fields[k]["provenance"]

    # --- insolation: observed else derived ---
    if insol is not None:
        insol_prov, insol_note = "observed", ""
    else:
        insol = phys.insolation_searth(lum, a_au)
        insol_prov = "derived" if insol is not None else "unknown"
        insol_note = "S = (L/Lsun) / (a/AU)^2" if insol is not None else ""
    fields["insolation_searth"] = _field(insol, insol_prov, "S_earth",
                                         _f(row, "pl_insolerr1"), insol_note)
    prov["insolation_searth"] = fields["insolation_searth"]["provenance"]

    # --- equilibrium temperature: observed else derived from insolation ---
    if eqt_obs is not None:
        eq_temp, eqt_prov, eqt_note = eqt_obs, "observed", ""
    else:
        eq_temp = phys.equilibrium_temp_k(insol, 0.30)
        eqt_prov = "derived" if eq_temp is not None else "unknown"
        eqt_note = "T_eq = 278.5 K (1-A)^0.25 (S/Searth)^0.25, A=0.30" if eq_temp is not None else ""
    fields["eq_temp_k"] = _field(eq_temp, eqt_prov, "K", _f(row, "pl_eqterr1"), eqt_note)
    prov["eq_temp_k"] = fields["eq_temp_k"]["provenance"]

    # --- density: observed else derived from M,R ---
    if dens_obs is not None:
        density, dens_prov = dens_obs, "observed"
    else:
        density = phys.density_gcc(mass, radius)
        dens_prov = ("modelled" if prov["mass_earth"] == "modelled" else "derived") \
            if density is not None else "unknown"
    fields["density_gcc"] = _field(density, dens_prov, "g/cm^3")

    escape = phys.escape_velocity_kms(mass, radius)
    esc_prov = ("modelled" if prov["mass_earth"] == "modelled" else "derived") \
        if escape is not None else "unknown"
    fields["escape_velocity_kms"] = _field(escape, esc_prov, "km/s")

    # --- habitable zone ---
    hz = phys.hz_position(insol, st_teff)
    hz_bounds = phys.hz_distance_boundaries_au(st_teff, lum)

    # --- observability (Kempton et al. 2018 TSM / ESM) ---
    transiting = bool(row.get("tran_flag"))
    j_mag = _f(row, "sy_jmag")
    k_mag = _f(row, "sy_kmag")
    trandep = _f(row, "pl_trandep")      # archive: transit depth in percent
    trandur = _f(row, "pl_trandur")      # hours
    kempton_teq = phys.kempton_eq_temp_k(st_teff, st_rad, a_au)

    tsm = esm = None
    if transiting:
        tsm = phys.transmission_spectroscopy_metric(radius, mass, kempton_teq, st_rad, j_mag)
        esm = phys.emission_spectroscopy_metric(radius, kempton_teq, st_teff, st_rad, k_mag)
    tsm_thr = phys.tsm_threshold(radius)

    def _tier(v: Optional[float], thr: float) -> Optional[str]:
        if v is None:
            return None
        if v >= thr:
            return "strong"
        if v >= 0.5 * thr:
            return "marginal"
        return "weak"

    tsm_prov = ("modelled" if prov["mass_earth"] == "modelled" else "derived") if tsm is not None else "unknown"
    fields["tsm"] = _field(tsm, tsm_prov, "", note="Kempton et al. 2018 transmission-spectroscopy metric")
    fields["esm"] = _field(esm, "derived" if esm is not None else "unknown", "",
                           note="Kempton et al. 2018 emission-spectroscopy metric")
    fields["transit_depth_ppm"] = _field(None if trandep is None else trandep * 1e4, "observed", "ppm")
    fields["transit_duration_hr"] = _field(trandur, "observed", "h")
    fields["st_jmag"] = _field(j_mag, "observed", "mag")
    fields["st_kmag"] = _field(k_mag, "observed", "mag")

    reasons = []
    if not transiting:
        reasons.append("planet does not transit — transmission/emission spectroscopy not applicable")
    elif tsm is None:
        miss = [n for n, v in (("mass", mass), ("J-band magnitude", j_mag),
                               ("stellar radius", st_rad)) if v is None]
        if miss:
            reasons.append("missing " + ", ".join(miss) + " for a TSM estimate")
    observability = {
        "transiting": transiting,
        "tsm": None if tsm is None else round(tsm, 2),
        "esm": None if esm is None else round(esm, 2),
        "tsm_threshold": tsm_thr,
        "tsm_tier": _tier(tsm, tsm_thr),
        "esm_tier": _tier(esm, 7.5),
        "kempton_eq_temp_k": None if kempton_teq is None else round(kempton_teq, 1),
        "transit_depth_ppm": None if trandep is None else round(trandep * 1e4, 1),
        "transit_duration_hr": trandur,
        "st_jmag": j_mag,
        "st_kmag": k_mag,
        "notes": reasons,
    }

    # relative measurement errors for the confidence model
    rel_errors: dict[str, float] = {}
    for k, ekey in (("radius_earth", "pl_radeerr1"), ("semi_major_au", "pl_orbsmaxerr1"),
                    ("st_teff", "st_tefferr1"), ("insolation_searth", "pl_insolerr1")):
        base, err = fields[k]["value"], _f(row, ekey)
        if base and err:
            rel_errors[k] = abs(err) / abs(base)

    derived = {
        "radius_earth": radius, "mass_earth": mass, "semi_major_au": a_au,
        "eccentricity": ecc, "insolation_searth": insol, "eq_temp_k": eq_temp,
        "surface_temp_k": None,
        "density_gcc": density, "escape_velocity_kms": escape,
        "st_teff": st_teff, "st_rad": st_rad, "st_lum": lum,
        "st_spectype": st_spectype, "st_age_gyr": st_age,
        "hz_position": hz, "hz_bounds_au": hz_bounds,
        "tsm": tsm, "esm": esm, "transiting": transiting,
        "provenance": prov, "rel_errors": rel_errors,
    }

    planet = {
        "id": slug(name),
        "name": name,
        "hostname": row.get("hostname"),
        "system": {
            "n_planets": row.get("sy_pnum"),
            "n_stars": row.get("sy_snum"),
            "distance_pc": dist_pc,
        },
        "discovery": {
            "year": row.get("disc_year"),
            "method": row.get("discoverymethod"),
            "controversial": bool(row.get("pl_controv_flag")),
        },
        "coords": {"ra": _f(row, "ra"), "dec": _f(row, "dec")},
        "star": {
            "spectype": st_spectype,
            "teff_k": st_teff, "radius_sun": st_rad, "mass_sun": st_mass,
            "luminosity_lsun": None if lum is None else round(lum, 6),
            "metallicity_dex": st_met, "age_gyr": st_age,
        },
        "fields": fields,
        "hz_bounds_au": hz_bounds,
        "hz_position": hz,
        "observability": observability,
    }
    return {"planet": planet, "derived": derived}
