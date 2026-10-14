# BhoomiSetu — From Your Land to Your Dream Home

BhoomiSetu is being developed in stages. The first milestone is a reliable plot editor; house design, costing, construction tracking, and service discovery follow later.

## Current repository status

- Proprietary `LICENSE` draft is present. Replace the contact-email placeholder before relying on it.
- Next.js + React + TypeScript frontend scaffold and responsive overview UI.
- The overview currently uses illustrative sample cards. It is not connected to a database or API yet.
- Plot geometry, persistence, authentication, maps, 2D/3D design, pricing, and marketplace features are planned—not yet implemented in this scaffold.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Planned technology

- Frontend: Next.js, React, TypeScript, CSS, Lucide icons.
- Backend: Python + FastAPI.
- Prototype persistence: SQLite; migrate to PostgreSQL + PostGIS when multi-user spatial queries justify it.
- Geometry: deterministic planar-metre polygon calculations; Shapely for server-side validation when introduced.
- Mapping: MapLibre GL JS later, with suitable projections for geospatial measurements.
- Testing: Pytest, TypeScript/ESLint, and Playwright browser tests in CI.

## Planned implementation order

1. Responsive dashboard and project creation UX.
2. Plot editor with vertex editing, geometry validation, area/perimeter and unit conversions.
3. Save/reopen/update/delete through FastAPI + SQLite and version-conflict handling.
4. Geometry/unit tests and browser end-to-end tests in CI.
5. Editable 2D house layouts and constraint checks.
6. Cost estimation with dated, sourced local rates.
7. Construction records and curated service-provider directory.
8. Maps/GPS, valuation, flood-risk layers, 3D, and multilingual voice only after reliable data and validation are available.

## Important limitations

Land measurements are planning aids, not a survey or title verification. Do not treat GPS boundaries, valuation estimates, flood information, building-rule checks, contractor credentials, or warranties as authoritative unless their sources and verification process are clearly stated.
