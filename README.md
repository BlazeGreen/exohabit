# ExoHabit

**From raw astronomical measurements to an explainable assessment of alien worlds.**

ExoHabit ranks every confirmed exoplanet with a measured radius or mass by a
model-derived **Habitability Potential** score, and shows exactly why each world
scores the way it does — the physics, the assumptions, the confidence, and what
remains unknown.

> This is a model-based assessment of habitability **potential**. It is not a
> measurement of life, and not proof that any world is habitable. Atmospheric
> composition and surface conditions are unknown for essentially every exoplanet.

---

## What's in the box

| Layer | Stack | Where |
|---|---|---|
| Data pipeline | Python 3, `requests` | `pipeline/` |
| Scientific engine | Kopparapu 2014 HZ, equilibrium temperature, ESI, Chen & Kipping mass–radius | `pipeline/physics.py` |
| Habitability model | transparent weighted score + physical viability gate + confidence | `pipeline/scoring.py`, `pipeline/scoring_config.json` |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 | `web/` |
| Live re-scoring | TS port of the model, runs in-browser for World Lab | `web/lib/model.ts` |

There is **no runtime backend or database**. The pipeline is a build step that
emits static JSON; the site is CDN-cacheable and scales to the whole catalogue
with nothing to keep alive.

## Pages

- **Universe Explorer** `/` — hero, catalogue scatter (radius vs. equilibrium temperature), curated shortlists, search
- **Rankings** `/rankings` — filter + sort the full catalogue
- **Planet Detail** `/planets/[id]` — score dial, exact "why this score" waterfall, habitable-zone diagram, ESI, evidence/unknowns, system view
- **Compare** `/compare` — up to three worlds side by side
- **World Lab** `/lab` — move any parameter, watch the assessment recompute live (same model as the catalogue)
- **Methodology** `/methodology` — every equation, assumption and limitation, for judges to challenge

## Run it locally

```bash
# 1. Build the data (needs Python 3.9+ and network for the NASA archive;
#    falls back to a bundled snapshot if offline)
python3 -m venv .venv
.venv/bin/pip install -r pipeline/requirements.txt
.venv/bin/python pipeline/build.py            # or: --demo to force the snapshot

# 2. Run the web app (needs Node 20+)
cd web
npm install
npm run dev                                   # http://localhost:3000
```

`npm run dev` / `npm run build` automatically sync `data/` into `web/public/data/`
via `web/scripts/sync-data.mjs`.

## Deploy (Vercel)

1. Import the repo, set **Root Directory = `web`**.
2. Framework preset: Next.js (auto-detected). No env vars required.
3. The committed `data/index.json`, `data/meta.json` and `data/planets/*.json`
   are all the frontend needs — Python does not run at deploy time.

To refresh the catalogue with the latest NASA data: re-run `pipeline/build.py`
and commit the changed files under `data/`.

## Scientific notes / known limitations

- Equilibrium temperature is a no-atmosphere blackbody estimate (Bond albedo
  0.30), **not** a surface temperature — greenhouse warming is not modelled.
- Mass is modelled from radius (Chen & Kipping 2017, approximate) when unmeasured;
  density and escape velocity inherit that uncertainty.
- The Kopparapu HZ parameterisation is calibrated for 2,600–7,200 K host stars;
  outside that range boundaries are extrapolated and confidence is penalised.
- Scoring weights (`pipeline/scoring_config.json`) are an explicit editorial
  choice, not scientific consensus.

## Data source

NASA Exoplanet Archive — Planetary Systems Composite Parameters (`pscomppars`),
accessed via the TAP/ADQL sync endpoint.
