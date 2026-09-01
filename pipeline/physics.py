"""
physics.py — Scientifically motivated derivations for ExoHabit.

Every function here maps OBSERVED quantities (from the NASA Exoplanet Archive)
to DERIVED quantities, with the governing equation and assumptions stated in
the docstring. Nothing in this file invents an observation: if an input is
missing, the output is None and the caller propagates that as UNKNOWN.

References
----------
Kopparapu et al. 2013, ApJ 765, 131          (habitable zone flux boundaries)
Kopparapu et al. 2014, ApJ 787, L29          (updated coefficients, used here)
Schulze-Makuch et al. 2011, Astrobiology 11  (Earth Similarity Index)
Chen & Kipping 2017, ApJ 834, 17             (probabilistic mass-radius, approx.)
"""

from __future__ import annotations

import math
from typing import Optional

# --- constants -------------------------------------------------------------
T_SUN_K = 5772.0          # solar effective temperature
S_EARTH_WM2 = 1361.0      # solar constant at 1 AU
T_BB_1AU_K = 278.5        # equilibrium temp of a zero-albedo body at 1 AU of the Sun
EARTH_DENSITY_GCC = 5.51
EARTH_ESCAPE_KMS = 11.19

Num = Optional[float]


def _ok(*vals: Num) -> bool:
    return all(v is not None and math.isfinite(v) and v > 0 for v in vals)


# --- stellar ---------------------------------------------------------------
def stellar_luminosity_lsun(st_teff: Num, st_rad: Num) -> Num:
    """L/Lsun = (R/Rsun)^2 * (Teff/Tsun)^4  (Stefan-Boltzmann, blackbody star).

    Used only when the archive has no measured luminosity.
    """
    if not _ok(st_teff, st_rad):
        return None
    return (st_rad ** 2) * ((st_teff / T_SUN_K) ** 4)


def insolation_searth(lum_lsun: Num, semi_major_au: Num) -> Num:
    """S/Searth = (L/Lsun) / (a/AU)^2  (inverse-square law).

    'Insolation' / 'stellar flux' = time-averaged bolometric flux the planet
    receives, in units of Earth's. Uses semi-major axis (not accounting for
    eccentricity; time-averaged flux scales as a^-2 / sqrt(1-e^2), a small
    correction we omit and flag).
    """
    if not _ok(lum_lsun, semi_major_au):
        return None
    return lum_lsun / (semi_major_au ** 2)


def equilibrium_temp_k(insol_searth: Num, bond_albedo: float = 0.30) -> Num:
    """T_eq = 278.5 K * (1 - A_B)^0.25 * (S/Searth)^0.25.

    Planet-wide radiative-equilibrium temperature for a fast-rotating body with
    Bond albedo A_B and no atmosphere / greenhouse effect. With A_B = 0.30 this
    returns 255 K at S = 1 (Earth's equilibrium temperature; Earth's *surface*
    is 288 K, the 33 K difference being the greenhouse effect, which we cannot
    estimate without atmospheric composition).
    """
    if insol_searth is None or not math.isfinite(insol_searth) or insol_searth < 0:
        return None
    return T_BB_1AU_K * ((1.0 - bond_albedo) ** 0.25) * (insol_searth ** 0.25)


# --- Kopparapu (2014) habitable zone -------------------------------------
# S_eff = S_eff_sun + a*dT + b*dT^2 + c*dT^3 + d*dT^4 ,  dT = Teff - 5780 K
# Valid 2600 K <= Teff <= 7200 K. Coefficients for a 1 Mearth planet.
_HZ_COEFFS = {
    "recent_venus":        (1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15),
    "runaway_greenhouse":  (1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15),
    "maximum_greenhouse":  (0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16),
    "early_mars":          (0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16),
}


def hz_flux_boundaries(st_teff: Num) -> Optional[dict]:
    """Return the four Kopparapu S_eff limits (in Searth) for this star.

    conservative HZ = [runaway_greenhouse (inner), maximum_greenhouse (outer)]
    optimistic  HZ = [recent_venus       (inner), early_mars         (outer)]
    """
    if not _ok(st_teff):
        return None
    t = max(2600.0, min(7200.0, st_teff))
    dt = t - 5780.0
    out = {}
    for name, (s0, a, b, c, d) in _HZ_COEFFS.items():
        out[name] = s0 + a * dt + b * dt ** 2 + c * dt ** 3 + d * dt ** 4
    out["teff_clamped"] = not (2600.0 <= (st_teff or 0) <= 7200.0)
    return out


def hz_distance_boundaries_au(st_teff: Num, lum_lsun: Num) -> Optional[dict]:
    """d = sqrt( (L/Lsun) / S_eff )  — flux limits mapped to orbital distance."""
    fb = hz_flux_boundaries(st_teff)
    if fb is None or not _ok(lum_lsun):
        return None
    return {k: math.sqrt(lum_lsun / v) for k, v in fb.items()
            if k != "teff_clamped"} | {"teff_clamped": fb["teff_clamped"]}


def hz_position(insol_searth: Num, st_teff: Num) -> Optional[dict]:
    """Where the planet sits relative to the habitable zone.

    Returns a dict with:
      zone        : 'conservative' | 'optimistic-inner' | 'optimistic-outer'
                    | 'too-hot' | 'too-cold'
      frac        : 0..1 position across the CONSERVATIVE HZ in log-flux
                    (0 = inner/runaway-greenhouse edge, 1 = outer/max-greenhouse
                    edge), clamped; None outside optimistic HZ
      in_conservative, in_optimistic : bool
    Higher insolation = hotter = closer to the star = frac near 0.
    """
    fb = hz_flux_boundaries(st_teff)
    if fb is None or insol_searth is None or not math.isfinite(insol_searth):
        return None
    inner_c, outer_c = fb["runaway_greenhouse"], fb["maximum_greenhouse"]
    inner_o, outer_o = fb["recent_venus"], fb["early_mars"]
    s = insol_searth
    in_c = outer_c <= s <= inner_c
    in_o = outer_o <= s <= inner_o
    if in_c:
        frac = (math.log(inner_c) - math.log(s)) / (math.log(inner_c) - math.log(outer_c))
        zone = "conservative"
    elif in_o and s > inner_c:
        frac = None
        zone = "optimistic-inner"
    elif in_o and s < outer_c:
        frac = None
        zone = "optimistic-outer"
    elif s > inner_o:
        frac = None
        zone = "too-hot"
    else:
        frac = None
        zone = "too-cold"
    return {
        "zone": zone,
        "frac": None if frac is None else max(0.0, min(1.0, frac)),
        "in_conservative": in_c,
        "in_optimistic": in_o,
        "flux_boundaries_searth": {k: v for k, v in fb.items() if k != "teff_clamped"},
        "teff_clamped": fb["teff_clamped"],
    }


# --- bulk properties -----------------------------------------------------
def density_gcc(mass_earth: Num, radius_earth: Num) -> Num:
    """rho = rho_earth * (M/Mearth) / (R/Rearth)^3."""
    if not _ok(mass_earth, radius_earth):
        return None
    return EARTH_DENSITY_GCC * mass_earth / (radius_earth ** 3)


def escape_velocity_kms(mass_earth: Num, radius_earth: Num) -> Num:
    """v_esc = v_esc,earth * sqrt( (M/Mearth) / (R/Rearth) )."""
    if not _ok(mass_earth, radius_earth):
        return None
    return EARTH_ESCAPE_KMS * math.sqrt(mass_earth / radius_earth)


def mass_from_radius_earth(radius_earth: Num) -> Optional[tuple[float, str]]:
    """Approximate Chen & Kipping (2017) forecaster, deterministic median branch.

    Returns (mass_in_Mearth, note). MODELLED, not observed — the caller must
    tag it as such. Two power-law branches with a break near the
    Terran/Neptunian transition (~2 Rearth):
        Terran     R <= 1.23 Rearth : M = R^3.58
        transition 1.23 < R < 2     : blended
        Neptunian  R >= 2  Rearth   : M = (R / 1.008)^(1/0.589)
    """
    if not _ok(radius_earth):
        return None
    r = radius_earth
    m_terran = r ** 3.58
    m_neptune = (r / 1.008) ** (1.0 / 0.589)
    if r <= 1.23:
        m = m_terran
    elif r >= 2.0:
        m = m_neptune
    else:
        w = (r - 1.23) / (2.0 - 1.23)
        m = (1 - w) * m_terran + w * m_neptune
    return m, "modelled from radius via Chen & Kipping 2017 median relation"


def earth_similarity_index(
    radius_earth: Num,
    density_gcc_val: Num,
    escape_kms: Num,
    surface_or_eq_temp_k: Num,
    ref: dict,
) -> Optional[dict]:
    """Schulze-Makuch et al. (2011) Earth Similarity Index.

    ESI_x = ( 1 - |(x - x_earth) / (x + x_earth)| ) ** (w_x / n)
    ESI   = product over available x of ESI_x         (n = count available)

    Weights w_x from the paper: radius 0.57, density 1.07, escape velocity 0.70,
    temperature 5.58. Global ESI in [0, 1]; Earth = 1. We substitute equilibrium
    temperature when surface temperature is unknown and flag it.
    """
    terms = [
        ("radius", radius_earth, ref["radius_earth"], 0.57),
        ("density", density_gcc_val, ref["density_gcc"], 1.07),
        ("escape_velocity", escape_kms, ref["escape_velocity_kms"], 0.70),
        ("temperature", surface_or_eq_temp_k, ref["surface_temp_k"], 5.58),
    ]
    avail = [(name, x, x0, w) for (name, x, x0, w) in terms if _ok(x, x0)]
    if not avail:
        return None
    n = len(avail)
    components, product = {}, 1.0
    for name, x, x0, w in avail:
        ci = (1.0 - abs((x - x0) / (x + x0))) ** (w / n)
        components[name] = max(0.0, min(1.0, ci))
        product *= components[name]
    return {"esi": max(0.0, min(1.0, product)), "components": components,
            "n_terms": n, "used_terms": [a[0] for a in avail]}


# --- observability: Kempton et al. 2018 metrics ---------------------------
# "A Framework for Prioritizing the TESS Planetary Candidates Most Amenable to
# Atmospheric Characterization", Kempton et al. 2018, PASP 130, 114401.
#
# TSM and ESM are relative figures of merit for JWST atmospheric follow-up,
# normalized so that they approximate the S/N of a fixed reference program.
# They ONLY apply to transiting planets. TSM assumes a cloud-free, low
# mean-molecular-weight (H/He-dominated) atmosphere and so OVERESTIMATES the
# feasibility of high-mmw (e.g. Earth-like N2/CO2) atmospheres — it ranks
# targets within a size class, it is not an absolute promise.

RSUN_IN_RE = 109.076          # Earth radii per solar radius
RSUN_IN_AU = 0.00465047       # AU per solar radius
_HC_OVER_K_M_K = 0.0143877688  # h c / k_B  [m K]

# TSM scale factors by planet-radius bin (Kempton 2018, Table 1)
_TSM_SCALE = [
    (1.50, 0.190),
    (2.75, 1.26),
    (4.00, 1.28),
    (10.0, 1.15),
]


def _tsm_scale_factor(radius_earth: float) -> float:
    for hi, s in _TSM_SCALE:
        if radius_earth < hi:
            return s
    return 1.15


def kempton_eq_temp_k(st_teff: Num, st_rad_sun: Num, semi_major_au: Num) -> Num:
    """Equilibrium temperature as defined for TSM/ESM: zero albedo, full
    day-night heat redistribution.  T_eq = T_star * sqrt(R_star / (2 a))."""
    if not _ok(st_teff, st_rad_sun, semi_major_au):
        return None
    return st_teff * math.sqrt((st_rad_sun * RSUN_IN_AU) / (2.0 * semi_major_au))


def transmission_spectroscopy_metric(
    radius_earth: Num, mass_earth: Num, eq_temp_k: Num,
    st_rad_sun: Num, j_mag: Num,
) -> Num:
    """TSM = scale * (Rp^3 * Teq) / (Mp * Rs^2) * 10^(-mJ/5).

    Rp, Mp in Earth units; Rs in solar radii; Teq in K (use kempton_eq_temp_k);
    mJ = host-star apparent J magnitude. Returns None if any input is missing.
    """
    if not _ok(radius_earth, mass_earth, eq_temp_k, st_rad_sun) or j_mag is None:
        return None
    scale = _tsm_scale_factor(radius_earth)
    tsm = (scale * (radius_earth ** 3) * eq_temp_k
           / (mass_earth * (st_rad_sun ** 2)) * (10.0 ** (-j_mag / 5.0)))
    return tsm if math.isfinite(tsm) and tsm >= 0 else None


def _planck_ratio_7_5um(t_hot: float, t_cold: float) -> float:
    """B_7.5um(t_hot) / B_7.5um(t_cold); the lambda^5 prefactor cancels."""
    lam = 7.5e-6
    x_hot = _HC_OVER_K_M_K / (lam * t_hot)
    x_cold = _HC_OVER_K_M_K / (lam * t_cold)
    return (math.expm1(x_cold)) / (math.expm1(x_hot))


def emission_spectroscopy_metric(
    radius_earth: Num, eq_temp_k: Num, st_teff: Num,
    st_rad_sun: Num, k_mag: Num,
) -> Num:
    """ESM = 4.29e6 * [B_7.5(1.10 Teq) / B_7.5(Tstar)] * (Rp/Rs)^2 * 10^(-mK/5).

    Secondary-eclipse (thermal emission) figure of merit; better for hot rocky
    worlds around bright stars. Rp, Rs converted to common units internally.
    """
    if not _ok(radius_earth, eq_temp_k, st_teff, st_rad_sun) or k_mag is None:
        return None
    t_day = 1.10 * eq_temp_k
    depth = (radius_earth / (st_rad_sun * RSUN_IN_RE)) ** 2
    esm = (4.29e6 * _planck_ratio_7_5um(t_day, st_teff) * depth
           * (10.0 ** (-k_mag / 5.0)))
    return esm if math.isfinite(esm) and esm >= 0 else None


def tsm_threshold(radius_earth: Num) -> float:
    """Kempton 2018 recommended 'worth pursuing' TSM by radius bin."""
    if radius_earth is None:
        return 90.0
    if radius_earth < 1.5:
        return 12.0        # small sample; practical bar for terrestrial worlds
    if radius_earth < 10.0:
        return 90.0
    return 96.0
