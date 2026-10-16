# BhoomiSetu: Research-to-Product Blueprint

**Status:** Evidence-informed product blueprint. This is a plan and research synthesis, not a claim that all described features exist.

## Executive direction

BhoomiSetu should not try to win by bolting a chatbot onto a floor-plan editor. Its differentiator should be a trustworthy, connected workflow for people planning a home on a specific plot, with every result traceable to geometry, assumptions, data source, and verification state.

The core principle is **one project record, multiple explainable tools**. Design, plot reference, cost assumptions, risk evidence, and construction records must not drift into unrelated sources of truth.

## Research reviewed

### 1. Constraint-aware floor-plan generation

**Hu et al., “Graph2Plan: Learning Floorplan Generation from Layout Graphs” (2020).**
- Source: https://arxiv.org/abs/2004.13204
- The paper describes user-in-the-loop generation combining room relationship graphs, a building boundary, a learned model, and room-box refinement, trained using the RPLAN dataset.
- Product implication: represent user needs as explicit constraints—room types, approximate dimensions, adjacency preferences, required rooms and boundary—before adding AI layout suggestions.
- Guardrail: a generated layout is a concept, not a code-compliant or construction-ready design. Show constraints met, violated or not evaluated; preserve the user's existing plan.

### 2. Measurement uncertainty

**Merry & Bettinger, “Smartphone GPS accuracy study in an urban environment” (PLOS ONE, 2019).**
- Source: https://doi.org/10.1371/journal.pone.0219890
- Product implication: preserve measurement method and available accuracy metadata; label GPS boundaries as estimates; allow manual correction; do not imply a phone GPS trace is a legal survey.
- Guardrail: never turn one accuracy value into a universal guarantee. Device, surroundings, sky visibility, multipath and sampling conditions vary.

### 3. Interoperable building information

**buildingSMART, Industry Foundation Classes (IFC) 4.3.2.0 / ISO 16739-1:2024.**
- Official documentation: https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/content/introduction.htm
- Overview: https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/
- IFC is an open, vendor-neutral standard for exchanging building and infrastructure information.
- Product implication: keep the internal design model typed and versioned; introduce a tested IFC subset only when the model has suitable architectural entities and exporter validation.
- Guardrail: exporting JSON does not make a product IFC-compatible. Declare exactly which entities and workflows are supported.

### 4. Quantity take-off and construction costs

**“BIM-based quantity takeoff: Current state and future opportunities” (2024 review).**
- Source: https://www.sciencedirect.com/science/article/pii/S0926580524002851
- Reviews benefits, implementation challenges, skills, software functionality and cost of BIM-based quantity take-off.

**Jafary, “Artificial intelligence (AI) and machine learning in building information modeling (BIM)-based construction cost estimation: a systematic review” (published online 16 April 2026).**
- Source: https://doi.org/10.1080/10095020.2026.2651578
- Reviews AI/BIM cost estimation across component classification, quantity take-off, material identification, and aggregation of material, labour and equipment costs.
- Product implication: separate measurable quantities from unit rates and commercial assumptions. An estimate must be a transparent calculation, not an unexplained AI answer.
- Minimum estimate record: item, unit, quantity, quantity formula, rate, rate unit, region, source, source date, tax/transport/wastage assumptions, coverage note and subtotal.
- Guardrail: do not publish invented local rates. If verified rates are unavailable, accept a user-entered quotation or label a scenario as user-supplied assumptions.

### 5. Climate-responsive residential design in India

**Manu et al., “Performance evaluation of climate responsive buildings in India — Case studies from cooling dominated climate zones” (Building and Environment, 2019).**
- Source: https://doi.org/10.1016/j.buildenv.2018.10.063
- Discusses measured performance of shading, ventilation, thermal mass and related strategies across Indian climate contexts.
- Product implication: eventually offer climate-aware design prompts—orientation, shading, cross-ventilation, roof and envelope options—as educational comparisons with stated assumptions.
- Guardrail: do not predict energy savings or comfort from room rectangles alone. Reliable estimates need climate, envelope, openings, occupancy and a validated calculation or simulation method.

**“Passive cooling potential in buildings under various climatic conditions in India” (2017).**
- Source: https://doi.org/10.1016/j.rser.2017.05.030
- Product implication: treat passive design as climate-dependent options, not one universal “best house” template.

### 6. Indian building requirements and professional review

**Bureau of Indian Standards, National Building Code of India 2016 (NBC 2016).**
- Official overview: https://www.bis.gov.in/standards/national-building-code/?lang=en
- Covers development-control rules, general building requirements, fire and life safety, materials, structural design, building services, sustainability and facility management.
- Product implication: a future rules framework needs jurisdiction, code/version, source clause, effective date, inputs, result and explicit “not assessed” states.
- Guardrail: the current concept editor does not establish code compliance, approval, structural safety, accessibility compliance or legal setbacks.

### 7. Historical flood evidence

**ISRO / National Remote Sensing Centre (NRSC), Flood Hazard Zonation.**
- Portal: https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/flood_hz/flood_hz.php?uname=empty
- NRSC explains that historical flood maps depend on satellite dataset availability and may miss peak inundation, flash floods, minor flooding or other events.
- Product implication: show geographic coverage, observation period, source and limitations alongside any layer.
- Guardrail: absence from a historical map is not proof of zero risk. Do not infer plot-level safety from coarse or unavailable data.

## Evidence-derived architecture

### A. Canonical project model
- Versioned project, plot, design, estimate, evidence and construction records.
- Lengths in metres in the geometry core; explicit transforms at display/export boundaries.
- Stable IDs, timestamps, schema validation and explicit migrations.
- The same design model feeds 2D rendering, later 3D preview, validation and future quantity calculations.
- Never silently move, resize, delete or normalize user geometry.

### B. Provenance for every important result
Each result should have a status (verified, estimated, user-provided, unavailable, or not assessed), source, timestamps when supported, coverage, assumptions, and method/version.
Do not label a contractor certified unless credentials and issuing authority have actually been checked. Keep “listed”, “documents supplied”, “issuer verified”, and “expired/unknown” as distinct states.

### C. Safe, staged design engine
1. Stable editable 2D rooms and plot boundary.
2. Explicit walls, openings and levels in the canonical model.
3. Read-only 3D generated from that same model.
4. User-approved layout suggestions based on stated room constraints.
5. Optional energy, quantity and cost calculations only after model inputs and methods are sufficient.
6. Export only formats and subsets that have tests.

### D. Transparent estimate engine
- Let users select scope (shell, finishing, services or line items).
- Quantities derive from explicit geometry rules or user input.
- Rates must be sourced or user-supplied, with date and region.
- Show low/base/high only with a documented method; never fabricate confidence intervals.
- Disclose exclusions such as land, approvals, professional fees, taxes or contingency when not included.

### E. Local-first now, secure sync later
- Keep browser-local records and JSON backup for the current prototype.
- Cloud sync requires authentication, authorization, backup/restore, deletion/export, concurrency handling and privacy/security review.
- Do not imply browser-local data is remotely synced or backed up.

### F. Multilingual voice and AI
- Voice/AI can collect and explain intent; it must not be the source of truth for geometry, legal conclusions, certification or engineering decisions.
- Convert speech into a proposed structured edit, preview it, require confirmation and provide undo.
- Test Telugu, Telugu-English, Hindi and English support before claiming coverage.

## Implementation roadmap

### Stage 0 — Trustworthy baseline
Confirm latest CI and print/export behavior; run geometry, storage, document schema, lint, type-check and production build. Fix discrepancies between UI labels and actual behavior. Do not merge main without explicit approval.

### Stage 1 — Canonical model integration
Connect the versioned model to editor load/save/import/export. Migrate legacy version-1 plans without changing geometry. Test migrations, duplicate IDs, unsupported versions, malformed JSON, size limits and preservation. Never silently overwrite an invalid plan.

### Stage 2 — Better 2D editing
Add grid, coordinate axes, dimension annotations, keyboard accessibility and clearer error states. Share explicit transforms between plot overlay and fit checks. Distinguish overlap, invalid dimensions, geometric plot fit and rules not assessed.

### Stage 3 — 3D preview
Generate conceptual geometry from the canonical model. Keep editing and persistence working if the renderer fails. Test 2D/3D dimension parity. Label conceptual elements honestly.

### Stage 4 — Evidence-backed budget
Start with an estimate schema and user-entered line items. Add sourced rate sheets and quotes with date, unit normalization and audit trail. Add quantity take-off only for model elements with explicit, tested measurement rules.

### Stage 5 — Site context
Integrate data only where licensing, access, coverage and update frequency are understood. Distinguish no data, low coverage, stale data and assessed risk. Preserve source limitations.

### Stage 6 — Construction management and services
Add milestones, quotations, change orders, progress photos, invoices and warranty documents. Contractor/supplier records need verifiable credential metadata and expiry tracking. Never promise a guarantee unless a real contract/provider backs it and terms are disclosed.

### Stage 7 — User validation
Test with people planning homes, local builders and qualified design professionals. Evaluate task completion, geometry errors, estimate traceability, usability, language coverage and failure recovery. Report measured outcomes only after documented testing with real participants or datasets.

## Definition of “masterpiece”

A user should be able to:
1. Capture or draw a plot and understand measurement limitations.
2. Create and edit a design that visibly relates to that plot.
3. Save, reopen, export and recover it without losing geometry.
4. See exactly what fit checks do and do not assess.
5. Generate a cost breakdown with inspectable quantities, rates and assumptions.
6. Inspect risk and service information with source, coverage and freshness.
7. Record construction decisions and documents without confusing a listing with verification.
8. Use the product on mobile and in supported languages with accessible failure handling.

## References

1. Hu et al. (2020), Graph2Plan: https://arxiv.org/abs/2004.13204
2. Merry & Bettinger (2019), Smartphone GPS accuracy study: https://doi.org/10.1371/journal.pone.0219890
3. buildingSMART, IFC 4.3: https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/content/introduction.htm
4. BIM-based quantity takeoff review (2024): https://www.sciencedirect.com/science/article/pii/S0926580524002851
5. Jafary (2026), AI/ML in BIM-based cost estimation: https://doi.org/10.1080/10095020.2026.2651578
6. Manu et al. (2019), Climate-responsive buildings in India: https://doi.org/10.1016/j.buildenv.2018.10.063
7. Passive cooling in Indian climates (2017): https://doi.org/10.1016/j.rser.2017.05.030
8. BIS, National Building Code of India 2016: https://www.bis.gov.in/standards/national-building-code/?lang=en
9. ISRO/NRSC, Flood Hazard Zonation: https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/flood_hz/flood_hz.php?uname=empty

## Limitations

This is a product-oriented synthesis of accessible abstracts and official documentation, not a preregistered systematic review or full-text appraisal of every study. These sources inform design choices and cautions; they do not establish that BhoomiSetu is validated, compliant, accurate for every plot, or superior to competitors.
