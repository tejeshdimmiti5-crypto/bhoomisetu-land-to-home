# Home Design Prototype Contract

## Scope

The `/design` page is an early editable 2D room-block planner. It is intended to help a user explore room names, approximate dimensions, and relative placement before a professional plan is prepared.

## Current behaviour

- Starts with a sample arrangement of living room, bedrooms, kitchen and bathroom.
- Room names, X/Y positions, width and depth can be edited in metres.
- Rooms can be added and removed; this editor caps a plan at 40 rooms.
- The preview highlights the selected room and reports summed room area, approximate overall bounds, and rectangle overlap.
- A single versioned plan is saved in browser localStorage.
- The plan can be exported as JSON.
- The dashboard House designs navigation and feature shortcut open `/design`.

## Deliberate limitations

- This is a concept diagram, not a CAD/BIM system or construction drawing.
- Room rectangles do not yet model walls, doors, windows, circulation, stairs, structural elements, plumbing, electrical layouts, ventilation, setbacks or local building codes.
- A non-overlapping layout does not prove rooms are connected or that the plan is buildable.
- Area is the sum of room rectangles and may not equal carpet area or built-up area.
- Data is stored in the current browser only. There is no account sync, cloud backup or multi-device collaboration.
- The page does not yet link rooms to a measured land polygon or calculate a legally compliant building envelope.

## Next engineering steps

1. Add deterministic validation and automated tests for room records, geometry bounds, and overlap cases.
2. Add import and recovery validation for JSON plan backups.
3. Model wall thickness, doors and windows, then enforce a usable building envelope derived from a selected plot.
4. Add a proper plan model and persistence layer before adding 3D rendering.
5. Keep building-code and professional review requirements explicit rather than implying that a visual preview is approved for construction.
