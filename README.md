# ExoHabit

**From raw astronomical measurements to an explainable assessment of alien worlds.**

There are ~6,300 confirmed exoplanets and only a few dozen hours of JWST
atmosphere time per cycle. ExoHabit ranks the whole catalogue by a transparent,
model-derived **Habitability Potential** score **and** by **observability** with
current instruments — so a proposal writer or time-allocation committee can see
which worlds are both worth a closer look and actually characterisable now.
Every number traces back to either a real measurement or a stated equation.

> This is a model-based assessment of habitability **potential**. It is not a
> measurement of life, and not proof that any world is habitable. Atmospheric
> composition and surface conditions are unknown for essentially every exoplanet.

### At a glance (current build)

- **6,347** confirmed planets scored · **41** rank *high potential* (≥ 75)
- Habitability model: 6 weighted physics indicators + a viability gate +
  separate confidence, all defined in one editable config file
- Observation feasibility: **Kempton et al. 2018** TSM / ESM for every
  transiting planet (**4,731** of them)
- The punchline: of all 6,347, only **3** clear both bars — high potential
  *and* a strong transmission metric (TRAPPIST-1 d, e, f)
- Data: NASA Exoplanet Archive (`pscomppars`), refreshed by re-running the
  pipeline. No runtime backend or database — the site is static JSON.

---

## What's in the box

| Layer | Stack | Where |
|---|---|---|
| Data pipeline | Python 3, `requests` | `pipeline/` |
| Scientific engine | Kopparapu 2014 HZ, equilibrium temperature, ESI, Chen & Kipping mass–radius | `pipeline/physics.py` |
| Habitability model | transparent weighted score + physical viability gate + confidence | `pipeline/scoring.py`, `pipeline/scoring_config.json` |
| Observation feasibility | Kempton et al. 2018 TSM / ESM for transiting planets | `pipeline/physics.py`, `pipeline/features.py` |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 | `web/` |
| Live re-scoring | TS port of the model, runs in-browser for World Lab | `web/lib/model.ts` |

There is **no runtime backend or database**. The pipeline is a build step that
emits static JSON; the site is CDN-cacheable and scales to the whole catalogue
with nothing to keep alive.

## Pages

- **Universe Explorer** `/` — hero, catalogue scatter (radius vs. equilibrium temperature), curated shortlists, search
- **Rankings** `/rankings` — filter + sort the full catalogue (potential, radius, temp, distance, TSM, transiting, host-star class, …)
- **Planet Detail** `/planets/[id]` — score dial, exact "why this score" waterfall, habitable-zone diagram, ESI, observation feasibility (TSM/ESM), evidence/unknowns, 2D/3D planetary-system view
- **Observation Planner** `/planner` — Habitability Potential vs. TSM/ESM, the "promising and reachable" zone, ranked shortlist
- **Compare** `/compare` — up to three worlds side by side
- **World Lab** `/lab` — move any parameter, watch the assessment recompute live (same model as the catalogue)
- **Methodology** `/methodology` — data source, every equation, the scoring function, confidence, and limitations

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

The repo already contains the built `data/` — to just run the site, skip step 1
and go straight to `cd web && npm install && npm run dev`.

**Windows:** same steps, but use `python` instead of `python3` and the venv
binaries live at `.venv\Scripts\` instead of `.venv/bin/`:

```bat
python -m venv .venv
.venv\Scripts\pip.exe install -r pipeline\requirements.txt
.venv\Scripts\python.exe pipeline\build.py
```

The `cd web` / `npm` steps are identical on every platform.

## Deploy (GitHub Pages)

The app builds to a fully static export (`web/out/`), deployed by the workflow
in `.github/workflows/deploy.yml` on every push to `main`.

One-time setup: **Settings → Pages → Source → GitHub Actions**. The repo must be
public (or on a plan that allows Pages for private repos).

The site is served from `https://<user>.github.io/exohabit/`, so the workflow
builds with `NEXT_PUBLIC_BASE_PATH=/exohabit`. If you rename the repo, update
that value in the workflow.

To deploy anywhere else (Vercel, Netlify, Cloudflare Pages, any static host):
build `web/` with `npm run build` and serve `web/out/`. Set
`NEXT_PUBLIC_BASE_PATH` only if the site lives under a sub-path.

To refresh the catalogue with the latest NASA data: re-run `pipeline/build.py`,
run `npm run sync-data` in `web/`, and commit the changed files.

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
