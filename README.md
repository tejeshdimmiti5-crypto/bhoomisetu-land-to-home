# BhoomiSetu — From Your Land to Your Dream Home

BhoomiSetu is being developed in stages. The first milestone is a reliable plot editor; house design, costing, construction tracking, and service discovery follow later.

## Current repository status

- Proprietary `LICENSE` draft is present. Replace the contact-email placeholder before relying on it.
- Next.js + React + TypeScript frontend scaffold with responsive dashboard styling and a mobile navigation drawer.
- The overview currently uses illustrative sample cards. It is not connected to a database or API yet.
- Plot geometry, persistence, authentication, maps, 2D/3D design, pricing, and marketplace features are planned—not yet implemented in this scaffold.
- Mobile browser support is a first-class requirement. Every workflow must work on Android and iPhone screen sizes, not only desktop.
- This is currently a responsive web application, not a published native Android/iOS app. A PWA install experience can be added after core workflows are stable.

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
- Mobile: responsive, touch-friendly web UI from the same codebase; consider PWA installation/offline support after core workflows are stable.
- Backend: Python + FastAPI.
- Prototype persistence: SQLite; migrate to PostgreSQL + PostGIS when multi-user spatial queries justify it.
- Geometry: deterministic planar-metre polygon calculations; Shapely for server-side validation when introduced.
- Mapping: MapLibre GL JS later, with suitable projections for geospatial measurements.
- Testing: Pytest, TypeScript/ESLint, and Playwright browser tests in CI.

## Mobile acceptance criteria

- Test narrow screens (320px, 360px, 390px, and 430px) and tablet/desktop widths.
- No horizontal page overflow or clipped controls.
- Navigation, dialogs, forms, and plot editing must work with touch as well as mouse/keyboard.
- Keep important buttons and corner handles easy to tap; do not rely on hover-only interactions.
- Check portrait and landscape layouts, readable labels, safe scrolling, and on-screen keyboard behaviour.
- Run the same save/edit/reload/delete end-to-end flows at desktop and mobile viewports.

## Planned implementation order

1. Validate responsive dashboard and project creation UX on desktop and mobile.
2. Plot editor with touch-friendly vertex handles, geometry validation, area/perimeter and unit conversions.
3. Save/reopen/update/delete through FastAPI + SQLite and version-conflict handling.
4. Geometry/unit tests and browser end-to-end tests in CI, including mobile viewports.
5. Editable 2D house layouts and constraint checks.
6. Cost estimation with dated, sourced local rates.
7. Construction records and curated service-provider directory.
8. Maps/GPS, valuation, flood-risk layers, 3D, and multilingual voice only after reliable data and validation are available.

## Important limitations

Land measurements are planning aids, not a survey or title verification. Do not treat GPS boundaries, valuation estimates, flood information, building-rule checks, contractor credentials, or warranties as authoritative unless their sources and verification process are clearly stated.
