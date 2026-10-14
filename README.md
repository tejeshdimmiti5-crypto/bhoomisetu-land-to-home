# BhoomiSetu — From Your Land to Your Dream Home

BhoomiSetu is being developed in stages. The immediate goal is a reliable, mobile-friendly Land Studio. House design, costing, construction tracking, and service discovery are later phases—not part of the current scaffold.

## Repository and prototype status

- This repository currently contains the Next.js + React + TypeScript frontend scaffold and a responsive dashboard.
- Dashboard project cards and metrics are illustrative demo content; the dashboard is not connected to persistence or an API. The create-project dialog is currently a UI demonstration and does not save a project.
- A separate earlier prototype was reported to contain Python/JavaScript geometry logic, SQLite persistence, and 14 passing tests. Those prototype files and test results have not yet been reconciled or independently verified in this repository. Preserve that work; port its tests and behavior before replacing it.
- No working plot editor, production persistence, authentication, maps/GPS, 2D/3D house design, costing, or marketplace is claimed as implemented here.
- A responsive web app is the initial mobile target. This is not a published native Android/iOS application.

## Decisions and contracts to establish before saving real plots

### Storage strategy

Choose local-first versus cloud before implementing persistence. Recommended MVP: local-first project storage (for example, IndexedDB) with explicit JSON export/import and recovery guidance. Request persistent browser storage where supported, display storage status, and treat JSON export as the primary recovery safety net because browser storage can be evicted. Add cloud sync only with a documented conflict-resolution strategy. If cloud persistence is chosen earlier, authentication and per-user authorization must be implemented alongside it—not deferred until public launch.

### Measurement data contract

Every saved plot must include:
- `schema_version`
- `crs` (use `local-planar-m` for local planar metre coordinates; do not label local coordinates as GeoJSON)
- `coordinate_unit: "metre"`
- `origin: null` until the plot is georeferenced
- `ring`: polygon vertices `[[x, y], ...]` in a documented order
- `measurement_method`: for example `manual`, `traced`, `gps`, or `hybrid`
- provenance, capture time, accuracy/uncertainty when available, and limitations
- a record version for optimistic concurrency when concurrent edits are supported
- deletion/audit metadata where required

Round coordinates stored in the local planar model to 1 mm; calculate from the stored rounded vertices, while formatting display values separately. For the local-first MVP, the TypeScript geometry module is authoritative because it is the only runtime used by the frontend. If/when FastAPI is introduced, decide explicitly whether to move authority to the backend; any second implementation must pass the same shared JSON test vectors. Validate invalid/self-intersecting polygons before accepting a plot.

### Units

Use explicit, documented definitions rather than an unspecified “regional” conversion. Initial target units: square metres, square feet, square yards, international acres, cents, and gunta, with the applicable regional convention shown in the UI. Verify and cite the conversion definition for the initial target region before release. Exclude bigha until a specific region and definition are selected. Include a source/version and regression test for each supported definition.

## Requirements

- Node.js 20.9 or newer
- npm

## Run the current frontend scaffold

```bash
npm install
npm run dev
```

Open http://localhost:3000. This command is documented setup guidance; it is not a claim that a build or browser test has already passed.

## Planned technology

- Frontend: Next.js, React, TypeScript, CSS, Lucide icons.
- Mobile: responsive, touch-friendly web UI; PWA/offline support can follow core workflows.
- Backend, if retained: Python + FastAPI, with SQLite for the first server-backed prototype and PostgreSQL + PostGIS only when justified by spatial/multi-user requirements.
- Geometry: deterministic polygon calculations; a single authoritative engine and shared cross-language fixtures.
- Mapping: MapLibre GL JS later, with appropriate projection and data/tile licensing.
- Testing: existing prototype tests must be ported first; then Pytest, TypeScript/ESLint, and Playwright end-to-end tests in CI.

## Phase gates

### Phase 0 — Reconcile and establish a green baseline
1. Locate and preserve the earlier prototype source and its 14-test suite.
2. Port existing geometry tests and representative fixtures into this repo before rewriting geometry.
3. Add GitHub Actions CI immediately; require lint, TypeScript type-check and frontend build on every pull request and push. Add test commands when real test suites are present; do not treat an empty test runner as evidence of coverage.
4. Establish localization infrastructure before adding many screens; start with English and Telugu.
5. Audit dependency and map-data licenses before adding dependencies.
6. Review the proprietary license with an IP professional before commercial use; the current permission-request section directs enquiries to the repository issue channel, which must not be used for confidential information.

### Phase 1 — Land Studio MVP
- Implement plot drawing/editing and touch-friendly vertex handles.
- Provide manual numeric input as the primary measurement method.
- Validate polygon geometry and calculate area, perimeter and side lengths.
- Test normal and invalid shapes from this phase onward; tests are a gate for every phase, not a later cleanup task.
- Label outputs as planning estimates, not a professional survey.

### Phase 2 — Persistence and integrity
- Select local-first or cloud and document the decision.
- Implement create/read/update/delete without duplicate records, save/reload, export/import, schema migration and validation.
- Add optimistic concurrency, soft-delete/audit handling when relevant to the chosen storage model.
- If cloud is used, require authentication, per-user ownership checks, HTTPS and secure authorization before storing private user data.

### Phase 3 — Reliability and release readiness
- Keep unit, API and browser end-to-end tests running continuously from Phase 0/1.
- Test polygon edge cases, conversion references, edit/reload/delete, malformed data, storage failures and mobile workflows.
- Test at 320px, 360px, 390px and 430px plus tablet/desktop; no horizontal overflow or clipped controls.
- Add JSON export and a tested restore/recovery procedure.
- Do not call a release ready until relevant CI checks pass and known data-loss issues are fixed.

## Mobile acceptance criteria

- Test narrow screens (320px, 360px, 390px, and 430px) and tablet/desktop widths.
- No horizontal page overflow or clipped controls.
- Navigation, dialogs, forms, and plot editing must work with touch as well as mouse/keyboard.
- Keep important buttons and corner handles easy to tap; do not rely on hover-only interactions.
- Check portrait and landscape layouts, readable labels, safe scrolling, and on-screen keyboard behaviour.
- Run save/edit/reload/delete flows at desktop and mobile viewports.
- Include at least one low-end Android/real-device check under a throttled mobile network before public release.

## Future phases (only after Phase 0–3 gates pass)

1. Editable 2D house plans, then 3D visualization and authority-specific rule configurations.
2. Construction cost estimates showing source, location, rate date, assumptions and exclusions; start with one city.
3. Construction records and a carefully reviewed service-provider directory.
4. One-state land-data integration after manual entry and document upload are handled reliably; choose a target state and official data source before implementing.
5. GPS/map capture only with suitable projection, multiple readings, displayed accuracy/uncertainty, manual correction and clear “approximate” labelling.
6. Voice/document assistant only after choosing providers, language performance expectations, privacy consent and an operating cost ceiling.

## Product, safety and market limits

- Land measurement is a planning aid, not an authorized survey, title opinion, legal advice, or proof of ownership.
- Valuation, flood-risk layers, local rules and credentials must show trustworthy source, applicable region, verification method and effective/as-of date. Until a source is wired and dated, these features are planned only.
- Do not upload private land deeds or identity documents to an LLM without explicit informed consent and a documented privacy policy.
- For real user documents, plan private storage, encryption, per-user isolation, limited-duration access links, export/delete controls and tested backups.
- Do not hold construction funds or promise a house guarantee without qualified legal and regulatory review and appropriately authorized partners.
- Before expanding beyond the Land Studio, interview 10–20 intended users and decide whether the product solves a real problem for a clearly defined initial buyer.
- Review naming/trademark availability before investing in public brand promotion; this README does not establish that the name is available.

