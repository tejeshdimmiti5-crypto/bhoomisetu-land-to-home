# BhoomiSetu research review: paper-by-paper findings and engineering decisions

**Review date:** 16 October 2026  
**Purpose:** Turn six identified research papers into concrete, evidence-aware engineering decisions for BhoomiSetu.  
**Scope note:** This is a targeted narrative review, not a preregistered systematic review. I accessed the full arXiv text for Graph2Plan, the full open-access PLOS article for the GPS study, the publisher's accessible article sections/abstract for the BIM quantity-takeoff review, the publisher's full-text HTML for Jafary's 2026 review, and accessible publisher sections/abstracts for the two building-climate papers. Access to publisher-hosted full PDFs was not confirmed for every paper. Findings below distinguish what the paper reports from product-design inference. No paper validates BhoomiSetu itself.

---

## Executive synthesis

The six papers do not support building one giant black-box AI that claims to design, price, and certify a house. Together they support a staged system:

1. **Capture a plot with uncertainty and provenance.**
2. **Collect explicit design constraints and generate editable candidates, not authoritative building plans.**
3. **Derive quantities from a richer building model only when the required elements and measurement rules exist.**
4. **Keep quantities, unit rates, and commercial assumptions separate.**
5. **Treat climate-responsive guidance as climate- and building-specific; do not predict comfort or energy savings from a simple room diagram.**
6. **Use explicit coverage, source, date, and limitation labels on every data-derived result.**

### Most important decisions for BhoomiSetu

- Do not label phone GPS capture as a survey or advertise a universal accuracy figure.
- Improve the current editor with explicit room constraints and deterministic geometric validation before adding generative AI.
- Keep the estimate engine deterministic and traceable; source metadata is not itself proof that a rate is verified.
- Do not calculate a bill of quantities from room rectangles alone. Walls, openings, levels, structure, finishes, services and quantity rules are missing.
- Do not recommend a single passive-cooling recipe for all Indian locations.
- Preserve human review and the user's ability to edit, reject and undo generated suggestions.

---

## Paper 1 — Graph2Plan: Learning Floorplan Generation from Layout Graphs

**Citation:** Ruizhen Hu, Zeyu Huang, Yuhan Tang, Oliver van Kaick, Hao Zhang and Hui Huang (2020). *Graph2Plan: Learning Floorplan Generation from Layout Graphs*. ACM Transactions on Graphics 39(4), Article 1.  
**Primary source:** https://arxiv.org/abs/2004.13204  
**DOI:** https://doi.org/10.1145/3386569.3392391  
**Access reviewed:** Full arXiv HTML text was accessible.

### Research question and method
The paper studies how to generate a floor plan from a building boundary and sparse user constraints. It represents rooms as nodes in a layout graph; edges encode spatial relationships/adjacency. User constraints include room counts, room locations and adjacency preferences. The method retrieves candidate graphs from the RPLAN floor-plan dataset, transfers/adjusts them to a target boundary, and uses a learned model to produce a raster plan and room bounding boxes. A refinement/optimization step aligns the boxes into a vectorized plan.

The authors report extracting more than 80,000 layout graphs from the RPLAN collection (described as over 120,000 floor plans). The model combines graph-based and image-based neural processing. The paper also describes a user study, an ablation study and comparison against a prior approach.

### Findings that matter
- A boundary alone does not fully encode a person's needs; room types, counts, location preferences and adjacency are useful explicit inputs.
- A graph representation is a practical bridge between natural-language requirements and geometric room placement.
- Direct model output can contain room-box misalignment/overlap; refinement is an important part of the pipeline, not an optional polish step.
- The paper reports that over 93% of rooms in RPLAN can be represented as the intersection of a bounding box with the building boundary. This is a dataset-specific observation, not a universal guarantee about Indian homes or all room geometries.

### Limitations / transfer risks
- The method is trained on RPLAN; its learned priors reflect that dataset and do not automatically represent local building practices, plot shapes, family needs, or regulations in Andhra Pradesh.
- Rectilinear room boxes do not capture all possible room shapes.
- Geometric fit and adjacency do not establish ventilation, circulation, fire egress, structural feasibility, accessibility, setbacks or regulatory compliance.
- A plausible generated layout is not a construction drawing.
- Reusing a dataset/model requires checking its licence, terms, provenance and suitability before product use.

### BhoomiSetu engineering decisions
**Near term:** Add a structured design brief: required room types/counts, approximate size ranges, adjacency preferences, preferred entrance side, and user priorities. Represent these constraints explicitly and show them back to the user before any generation.  
**Next:** Generate multiple editable candidates using a deterministic constraint/optimization baseline first. Run all candidates through existing room-overlap and plot-containment checks. Mark constraints as satisfied, violated or not checked.  
**Later:** Evaluate a learned generator only after checking dataset licensing and collecting a representative evaluation set with local design professionals.

### Acceptance tests to write
- Candidate generation never silently replaces the current plan.
- Each candidate records its input boundary/version and user constraints.
- Invalid/overlapping candidates are rejected or clearly flagged.
- User can edit, compare, undo and revert.
- Test cases include rectangular and concave plot/building boundaries, awkward proportions, narrow access, required room adjacencies, and infeasible constraint combinations.
- No output claims code compliance or structural safety.

---

## Paper 2 — Smartphone GPS accuracy study in an urban environment

**Citation:** Krista Merry and Pete Bettinger (2019). *Smartphone GPS accuracy study in an urban environment*. PLOS ONE 14(7): e0219890.  
**Primary source:** https://doi.org/10.1371/journal.pone.0219890  
**Open-access full text:** https://pmc.ncbi.nlm.nih.gov/articles/PMC6638960/  
**Access reviewed:** Full open-access article and publisher result sections were accessible.

### Research question and method
The study evaluated horizontal position error using an iPhone 6 and Avenza software in an urban environment, considering two seasons, times of day, and perceived Wi-Fi usage periods. It compared GPS-only and Wi-Fi-enabled observations using non-parametric statistical tests because the observed error distributions were generally not normal.

### Reported findings
- The overall mean horizontal position accuracy reported in the abstract was roughly 7–13 metres, consistent with recreation-grade GPS in potentially high multipath environments.
- GPS-only observations ranged from 0.05 m to 99.7 m error in the study; overall GPS-only RMSE was about 9.9 m.
- Error varied substantially by collection point and scenario, with relatively large confidence intervals.
- More open collection points tended to have lower RMSE, consistent with less multipath interference.
- The study found moderate correlation between nearby buildings and positional error; weather had little influence in this particular experiment.
- The study did not establish one universal error bound for every smartphone, location or use case.

### Limitations / transfer risks
- The hardware was an iPhone 6 and the study environment and protocol were specific; modern phones and other environments can differ.
- Urban collection points are not a complete proxy for every rural plot, tree canopy, built-up lane or field condition.
- Point-position error is not the same as parcel-boundary accuracy. Walking a boundary compounds sampling, timing, antenna, path and corner-selection errors.
- A device's displayed accuracy estimate is not a guarantee that the true point lies inside that radius.

### BhoomiSetu engineering decisions
**Near term:** Retain the GPS method, timestamp and reported device accuracy for each capture point; show a visible GPS-estimate label; let users inspect and manually adjust vertices; show capture quality and incomplete-capture warnings.  
**Do not:** use a fixed “GPS is accurate to X metres” claim; turn phone capture into a legal boundary; infer ownership or cadastral boundaries from GPS points.  
**Later:** Compare GPS traces against independent surveyed reference boundaries across devices and settings before publishing any accuracy statistic.

### Acceptance tests / field validation
- Preserve accuracy metadata per vertex, not just one project-level number.
- Warn when accuracy is missing or exceeds a configurable quality threshold, but explain the threshold is a product warning, not a legal tolerance.
- Test drift, duplicate points, jumps, poor accuracy, interrupted capture and manual correction.
- Run a field study with surveyed reference points before making product-wide accuracy claims.

---

## Paper 3 — BIM-based quantity takeoff: Current state and future opportunities

**Citation:** Shadi Alathamneh, Wesley Collins and Salman Azhar (2024). *BIM-based quantity takeoff: Current state and future opportunities*. Automation in Construction 165, 105549.  
**Primary source:** https://doi.org/10.1016/j.autcon.2024.105549  
**Publisher page:** https://www.sciencedirect.com/science/article/pii/S0926580524002851  
**Access reviewed:** Publisher abstract, highlights, and accessible article sections/conclusion snippets; full publisher PDF access was not confirmed.

### Research question and method
This review applies a PRISMA-style systematic process to BIM-based quantity takeoff (QTO). The publisher page reports an initial 238 journal articles screened and 52 selected articles from Scopus and Web of Science. It examines benefits, implementation methods, challenges and future research directions, then proposes a conceptual model for sustainable adoption.

### Reported findings
- BIM-based QTO / 5D BIM is associated in the reviewed literature with improvements in productivity, accuracy and completeness.
- Adoption challenges include management, professional skills, software functionality and implementation cost.
- The highlights identify professional skill limitations as a major challenge.
- BIM databases can support 5D BIM practices, API development, life-cycle cost (LCC) and life-cycle assessment (LCA).
- The paper identifies software development and training/upskilling as future opportunities.

These are review-level findings across literature, not a guarantee that every BIM model or automated QTO implementation is accurate.

### Limitations / transfer risks
- QTO quality depends on model completeness, semantic classification, units, modelling conventions, rules and software implementation.
- A floor plan made of room rectangles is not a BIM model with walls, doors, windows, slabs, reinforcement, services and finishes.
- Different contractors/specifications can define measurement rules and waste/overlap differently.
- The article's systematic review scope is BIM-QTO literature, not validation of a lightweight consumer plot-to-house app.

### BhoomiSetu engineering decisions
**Near term:** Keep user-entered cost lines separate from geometric calculations. Do not imply current totals are a bill of quantities derived from the design.  
**Next:** Extend the canonical design schema only when needed: wall segments, openings, storeys, floor/roof elements, material specifications and explicit units. Implement one quantity rule at a time with examples and independent checks.  
**Later:** Generate a versioned quantity schedule with model element IDs, formula, units, rounding, exclusions and review state. Permit a qualified professional to inspect it.

### Acceptance tests
- Every computed quantity links to the model element(s) and named rule that produced it.
- Unit conversions and rounding are explicit.
- Model changes invalidate affected quantities and estimates.
- Unknown geometry produces “not calculated,” not zero.
- Validate quantity outputs against manually prepared benchmark examples reviewed by a quantity surveyor.
- Do not call an estimate a complete BOQ while scope elements are missing.

---

## Paper 4 — AI and machine learning in BIM-based construction cost estimation: a systematic review

**Citation:** Peyman Jafary (published online 16 April 2026). *Artificial intelligence (AI) and machine learning in building information modeling (BIM)-based construction cost estimation: a systematic review*. Geo-spatial Information Science.  
**Primary source / DOI:** https://doi.org/10.1080/10095020.2026.2651578  
**Full-text HTML:** https://www.tandfonline.com/doi/full/10.1080/10095020.2026.2651578  
**Access reviewed:** Full-text HTML was indexed and accessible in the search result; publisher PDF download was not separately validated.

### Research question and method
The review examines where AI/ML integrates into BIM-based estimation, from semantic component classification through quantity takeoff to the final aggregation of costs. It reports a systematic review of 77 papers. Its search process initially screened titles, keywords and abstracts of 441 records; 71 full texts were assessed; 45 met inclusion criteria; backward/forward snowballing added 32 papers, for 77 included studies. The paper describes using Scopus and Web of Science and a PRISMA framework.

The review organizes the problem into three stages:
1. Building/component breakdown and semantic enrichment of BIM models.
2. Quantity takeoff and identification of corresponding materials.
3. Cost estimation, including direct costs for materials, labour and equipment and aggregation into project cost.

### Findings that matter
- AI/ML can support different stages, but those stages depend on structured BIM information.
- The review stresses that early-stage cost estimation is inherently difficult because information is limited and designs can change.
- Cost work includes more than a single material-rate prediction: quantities, labour, equipment, indirect costs and contingencies may be relevant.
- The review's structure suggests that a trustworthy system should isolate and evaluate each stage instead of treating “AI estimate” as one undifferentiated output.

### Limitations / transfer risks
- This is a synthesis of prior studies, not a single model tested on BhoomiSetu's target region.
- Model performance depends on data coverage, labels, project type, cost definitions, date and geography; results from one market cannot be assumed to transfer to Andhra Pradesh.
- Predictions from historical data can become stale under inflation, supply changes, transport cost, labour availability, taxes and specification changes.
- A high-level room layout is insufficient for many cost drivers.
- A review of 77 papers does not imply there is a ready-made model, accessible dataset, or deployable API for BhoomiSetu.

### BhoomiSetu engineering decisions
**Now:** Use deterministic arithmetic on rates explicitly entered by the user and keep quote/source labels, dates, regions, units, wastage and exclusions visible. Label source status honestly; a string entered by the user does not mean that the source has been independently verified.  
**Next:** Add separate data sources for quantities and unit rates. Define coverage before estimating. Add categories for material, labour, equipment, transport, taxes, professional fees, approvals and contingency, while allowing scope exclusions.  
**Later:** Evaluate ML only against a time-stamped, permissioned dataset of comparable local projects with a clear target (e.g., material price, trade cost, or total project cost), held-out evaluation, baseline comparison and uncertainty reporting.

### Acceptance tests / evaluation
- Every estimate can be recomputed from stored inputs.
- Missing items are explicitly excluded, never treated as zero-cost evidence.
- Rates display currency, unit, date, region and provenance.
- No “verified” badge unless a defined verification procedure ran and its evidence is stored.
- For any later ML model, publish error metrics by cost category, region and project stage; compare against simple baselines and document data leakage controls.
- Reject stale or out-of-region rates according to explicit policy, or warn clearly.

---

## Paper 5 — Performance evaluation of climate-responsive buildings in India: case studies from cooling-dominated climate zones

**Citation:** Sanyogita Manu, Gail Brager, Rajan Rawal, Angela Geronazzo and Devarsh Kumar (2019). *Performance evaluation of climate responsive buildings in India — Case studies from cooling dominated climate zones*. Building and Environment 148, 136–156.  
**Primary source / DOI:** https://doi.org/10.1016/j.buildenv.2018.10.063  
**Publisher page:** https://www.sciencedirect.com/science/article/pii/S0360132318306887  
**Access reviewed:** Publisher abstract, highlights and accessible article sections; full publisher PDF access was not confirmed.

### Research question and method
The study examines six modern institutional and office buildings in warm-humid, hot-dry and composite climate zones. The buildings use a mixture of shading devices, courtyards, solar chimneys, cavity walls, thermal mass, day/night ventilation and evaporative cooling. The study monitored buildings for one year and used physical measurements and analysis methods including wall-section temperature-gradient overlays, heat maps and regression analysis to study relationships between outdoor and indoor conditions.

### Reported findings
- Construction/envelope strategies were important for reducing conductive heat gain across the studied contexts.
- Controlled infiltration was important for heat rejection in hot-dry and warm-humid contexts.
- The authors conclude that multiple strategies need to work together for a truly climate-responsive building.
- The results are grounded in six institutional/office case studies, not a universal residential-house prediction model.

### Limitations / transfer risks
- Building type and use matter: offices/institutional buildings differ from homes in occupancy, internal gains, schedules and comfort expectations.
- Only three cooling-dominated climate contexts are represented in the described case studies.
- Monitored performance of a completed building cannot be transferred directly to a proposed room layout without envelope, opening, shading, materials, occupancy, weather and operational assumptions.
- The paper does not justify an app claiming a fixed energy saving for a house from its orientation alone.

### BhoomiSetu engineering decisions
**Near term:** Collect the location and user priorities, but present climate suggestions as educational prompts, not performance guarantees.  
**Next:** Add a climate-context layer with source/date and simple prompts such as “consider external shading” or “consider cross-ventilation,” provided the relevant geometry and openings are represented.  
**Later:** For quantitative energy/comfort feedback, integrate a validated simulation workflow or a professionally reviewed calculation model with explicit weather files, envelope properties, openings, schedules and assumptions.

### Acceptance tests / evaluation
- Every recommendation shows why it was suggested and what inputs were used.
- Missing orientation, openings or material data leads to “not assessed.”
- No energy-saving percentage is displayed without a validated calculation, comparison baseline and documented assumptions.
- Validate recommendations with local architects/building-physics experts and representative climate datasets.

---

## Paper 6 — Passive cooling potential in buildings under various climatic conditions in India

**Citation:** Karthik Panchabikesan, Kumaresan Vellaisamy and Velraj Ramalingam (2017). *Passive cooling potential in buildings under various climatic conditions in India*. Renewable and Sustainable Energy Reviews 78, 1236–1252.  
**Primary source / DOI:** https://doi.org/10.1016/j.rser.2017.05.030  
**Publisher page:** https://www.sciencedirect.com/science/article/abs/pii/S1364032117306743  
**Access reviewed:** Publisher abstract and accessible bibliographic/abstract information; full publisher PDF access was not confirmed.

### Research question and method
The review synthesizes research on passive cooling methods across Indian climates, particularly direct evaporative cooling, nocturnal radiative cooling and phase-change-material (PCM) free cooling. It summarizes empirical equations/correlations used to estimate design parameters and estimates potential cooling for five selected locations: Chennai, Bengaluru, New Delhi, Jaipur, and Jammu and Kashmir, using corresponding weather data.

### Reported findings
- Passive cooling potential varies across climates and techniques.
- The secondary summary indexed by RePEc reports the highest yearly-average potential among the listed cases for Jaipur (hot-dry) and lower potential for Chennai (warm-humid), illustrating that one technique will not behave identically across climate types. Treat those figures as the paper's reported modeled estimates, not predicted savings for an individual BhoomiSetu house.
- The review is useful for screening possible strategies and the variables that affect their potential.

### Limitations / transfer risks
- A review and city-level potential estimates are not a measured performance guarantee for a particular building.
- Results depend on the method, weather data, humidity, night-sky conditions, building envelope, thermal mass, water availability, maintenance and occupant comfort assumptions.
- The locations studied do not automatically represent every microclimate in Andhra Pradesh or each plot's immediate surroundings.
- A room-only floor plan lacks the physical inputs needed for a defensible thermal prediction.

### BhoomiSetu engineering decisions
- Use the paper to create a research backlog of optional strategies, not a one-click “coolest house” claim.
- Gather exact location, weather source, orientation, roof/wall construction, window geometry and ventilation assumptions before attempting quantitative advice.
- Prefer comparative explanations (what a strategy does, conditions where it may help, trade-offs and maintenance) over a single predicted savings number.
- Have recommendations reviewed for local climate and practical construction feasibility.

### Acceptance tests
- Climate suggestions change only when relevant input assumptions change, and those assumptions are visible.
- Unsupported or missing climate/building inputs return “not assessed.”
- Any simulated result records method version, weather data source, baseline, parameters and limitations.
- Water-intensive or maintenance-sensitive cooling options must show trade-offs instead of being universally recommended.

---

## Cross-paper synthesis: what to build, in order

### Phase A — Correctness and evidence before AI
1. Integrate the canonical versioned design document with the existing editor and safe legacy migration.
2. Preserve plot measurement provenance and per-point GPS uncertainty.
3. Build a structured design brief and explicit geometric constraints.
4. Make the current cost planner clearly user-supplied and ensure empty/incomplete scope never appears as a zero-cost build.
5. Add tests for all imports, calculations, migration and geometry invariants.

### Phase B — Useful intelligence with transparent limits
6. Implement a deterministic layout candidate generator/constraint solver; show multiple options and rejected constraints.
7. Extend the design schema to model walls/openings/levels before estimating material quantities.
8. Create quantity rules with named formulas and benchmark examples reviewed by a qualified professional.
9. Add regional rates only from documented sources or quotes with date, unit, region and licence/permission.
10. Keep “source entered,” “source checked,” and “issuer independently verified” as separate states.

### Phase C — Climate, BIM and validation
11. Add climate advice only with known location and relevant design inputs.
12. Evaluate IFC export only after the model maps to supported IFC entities and round-trip/validator tests exist.
13. Run usability and accuracy studies with local users, survey references, builders, quantity surveyors and architects.
14. Report measured outcomes, not invented metrics.

---

## Evidence ledger

| Paper | Access level in this review | Strongest usable evidence | Main caveat |
|---|---|---|---|
| Graph2Plan (2020) | Full arXiv text | Graph constraints, boundary-conditioned generation, RPLAN, refinement | Dataset transfer and building-code validity not established |
| Smartphone GPS (2019) | Full open-access article | High variability; study-specific RMSE and conditions | One device/environment cannot establish universal accuracy |
| BIM QTO (2024) | Abstract/highlights/accessible sections | Review of 52 articles; implementation and skills barriers | Full PDF not confirmed; review findings do not validate this app |
| AI/ML + BIM cost review (2026) | Full-text HTML indexed/accessed | 77-paper synthesis and three-stage cost workflow | No local price dataset/model validation for BhoomiSetu |
| Climate-responsive buildings (2019) | Abstract/highlights/accessible sections | Six buildings, one-year monitoring, multiple combined strategies | Institutional/office case studies, not direct house predictions |
| Passive cooling in India (2017) | Abstract/bibliographic sources | Strategy potential differs by climate and weather inputs | City-level review estimates are not individual-house guarantees |

## References

1. Hu et al. (2020), Graph2Plan, https://doi.org/10.1145/3386569.3392391
2. Merry & Bettinger (2019), Smartphone GPS accuracy study, https://doi.org/10.1371/journal.pone.0219890
3. Alathamneh, Collins & Azhar (2024), BIM-based quantity takeoff, https://doi.org/10.1016/j.autcon.2024.105549
4. Jafary (2026), AI/ML in BIM-based cost estimation, https://doi.org/10.1080/10095020.2026.2651578
5. Manu et al. (2019), Climate-responsive buildings in India, https://doi.org/10.1016/j.buildenv.2018.10.063
6. Panchabikesan, Vellaisamy & Ramalingam (2017), Passive cooling in Indian climates, https://doi.org/10.1016/j.rser.2017.05.030

## Final caveat
This review is a product-engineering synthesis of accessible scholarly material, not an independent reproduction of experiments, a formal systematic review, or a professional architectural/engineering opinion. It does not prove that any future BhoomiSetu feature will be accurate until the feature is implemented and independently tested.
