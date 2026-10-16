# BhoomiSetu — From Land to Home

BhoomiSetu is a local-first planning prototype for capturing a plot, exploring a simple room layout, and calculating transparent planning estimates. This branch contains working frontend workflows and deterministic TypeScript modules; it is **not** a CAD/BIM system, legal survey tool, structural design system, or production marketplace.

## Current branch status

The active feature branch is `feat/land-studio-local-persistence`. Review and merge changes through the open draft PR; do not treat this branch as released production software.

### Implemented in this branch

- **Land Studio (`app/studio`)**: draw/edit plot boundaries, enter dimensions, validate polygon geometry, calculate area and perimeter, capture an approximate GPS-derived local frame, save plots in browser IndexedDB, list/edit/delete saved plots, and export/import JSON backups.
- **Geometry (`lib/geometry.ts`)**: local-planar metre coordinates, millimetre quantization before measurement, open polygon rings, finite-coordinate checks, edge/area/effective-width checks, self-intersection/touch rejection, and a vertex cap before the quadratic intersection check.
- **Plot storage (`lib/plot-store.ts`)**: versioned records, recomputed measurements on import, batch validation before writes, and non-destructive import behavior. New IDs in a backup are added; matching content is skipped; conflicting existing IDs are reported and left unchanged.
- **House Design (`app/design`)**: editable rectangular room layouts, room selection, overlap validation, dimension guides, candidate layout strategies, linking a saved plot for a geometric fit check, and local browser persistence with JSON import/export.
- **Design document (`lib/house-design-document.ts`)**: validated versioned design-document parsing and legacy migration.
- **Room-opening validation (`lib/room-openings.ts`)**: validates door/window opening data against room wall lengths and detects duplicate IDs and overlaps. This is a validation foundation, **not yet a complete interactive door/window editor or wall-rendering system**.
- **Estimate (`app/estimate`, `lib/estimate.ts`)**: deterministic arithmetic from user-entered assumptions. It does not provide independently verified live market rates.
- **Responsive UI and accessibility**: mobile-oriented styling and keyboard/focus affordances on relevant design controls.
- **CI**: GitHub Actions runs lint, eight deterministic test suites, TypeScript type-checking, and a production build.

### Not implemented or not verified as production features

- No authentication, cloud sync, multi-user collaboration, or server-side database.
- No legal survey accuracy or proof of land ownership.
- No full CAD/BIM engine, construction-ready plans, structural calculations, building-code approval, automated setback/code compliance, or validated 3D model generated from the 2D plan.
- No complete doors/windows placement UI, wall thickness model, columns, plumbing/electrical plans, or architectural circulation validation.
- No live land valuation, sourced flood-risk map, verified contractor/supplier directory, contractor certification checks, construction guarantees, or construction-progress platform.
- No multilingual voice agent yet.
- The dashboard contains illustrative/demo content in places. Do not interpret demo cards, sample dimensions, or generated visual concepts as verified property data or architect-approved plans.

## Technical setup

- Next.js, React, TypeScript, CSS, and Lucide icons.
- Local browser persistence: IndexedDB for plots and browser local storage for design documents.
- Geometry coordinates use a local planar frame measured in metres. GPS-derived coordinates are approximate and are not a substitute for a professional survey.
- No package lockfile is currently committed, so CI uses `npm install`; dependency resolution is not yet fully reproducible.

### Requirements

- Node.js **20.19.0 or newer** (matches `package.json` and `.nvmrc`)
- npm 10 or newer

### Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Quality checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The aggregate `npm test` command runs nine suites:

1. Polygon geometry
2. Plot storage/import/export
3. Floor-plan validation
4. Plot-fit checks
5. Design-document parsing/migration
6. Estimate calculations
7. Layout candidates
8. Room-opening validation
9. Source-backed area-unit conversions

Report checks as passing only when the corresponding local or GitHub Actions run confirms success. A green CI run is necessary but does not prove real-device usability or architectural correctness.

## Data and safety contracts

- Plot rings are open arrays of `[x, y]` vertices in local planar metres; the first vertex must not be repeated at the end.
- Geometry is quantized to 1 mm before validation and measurement. Rings above 500 vertices are rejected to bound the current O(n²) intersection algorithm.
- Imported geometry is re-measured; stored area/perimeter are not trusted as authoritative.
- Import is non-destructive by default: it adds new IDs, skips identical existing content, and reports conflicts without overwriting the local record. Back up important data before testing restore workflows.
- Browser storage can be cleared or evicted. Export JSON backups and keep a copy outside the browser.
- Plot fit is a geometric containment check only. It does not validate legal setbacks, road access, local floor-area ratio, structural safety, ventilation, or building regulations.
- Cost estimates depend on user-provided assumptions; rate sources, dates, location and exclusions must be verified before using them as budgets.
- Land values, flood risk, contractor credentials, warranties and guarantees must never be represented as verified until reliable sources, verification procedures and dates are integrated.

## Units

Geometry is stored in metres and areas are calculated in square metres. The versioned `lib/units.ts` module currently defines square metres, square feet, square yards, international acres, cents, and guntas, with regression tests. SI factors for square feet, square yards, and international acres follow NIST Handbook 133 (2025), Appendix E; cent and gunta are defined as 1/100 and 1/40 of an international acre. The Andhra Pradesh usage cross-check uses a secondary regional reference; local land records and local practice take precedence where a convention differs. Bigha remains excluded because it varies by region.

## Current priorities

1. Protect user data: conflict-safe imports, save/reload recovery, strict input validation, and bounded geometry work.
2. Establish a reproducible dependency lockfile in a network-enabled environment, then switch CI to `npm ci`.
3. Add a dedicated units module with documented conversion definitions and regression tests.
4. Expand test coverage around storage failure, concurrency, malformed backups, and real mobile browsers.
5. Evolve the room editor with an explicit versioned openings model and then render doors/windows from that model.
6. Only after geometry and data contracts are stable, improve architectural constraints and connect 3D visualization to the same canonical design document.

## Product limitations

BhoomiSetu currently supports **planning and visualization only**. Plot measurements are not an authorized survey, and design fit checks are not evidence of code compliance or structural safety. Before construction, users must have a qualified local architect/engineer verify dimensions, setbacks, ventilation, access, structure, services and applicable approvals.

Features such as valuations, flood-risk layers, service-provider verification, construction guarantees, cloud sync and AI/voice assistance require trustworthy data sources, clear privacy/consent practices, and separate implementation and validation work.
