# BhoomiSetu measurement contract (v0.1)

## Scope

The current Land Studio is a manual, local-planar plot editor. It is not a GPS survey, a cadastral boundary authority, or a substitute for a licensed surveyor. Coordinates are user-entered metres in an arbitrary local frame.

## Canonical geometry

- Coordinate reference: `local-planar-m`.
- Coordinate unit: metre.
- Origin: `null` until a future georeferencing workflow is implemented.
- Ring convention: open ring; the first vertex must not be repeated at the end.
- Vertex shape: exactly two finite numeric values `[x, y]`; booleans are invalid.
- Coordinates are rounded to 1 mm using round-half-away-from-zero before validation and measurement.
- Area and perimeter are calculated from the rounded coordinates that are returned and saved.
- Either winding direction is accepted.
- Adjacent vertices that collapse after rounding, too-short edges, self-intersections/touches, zero/tiny areas, and narrow slivers are rejected.
- Default minimum edge is 0.001 m; default minimum area is 0.0001 m²; the sliver guard uses an effective-width proxy `2 × area / perimeter >= 0.01 m`. This proxy is not the polygon inradius.

## Saved records

Each saved record has a stable ID, schema version, created/updated timestamps, record version, canonical ring, area, perimeter, coordinate contract, and measurement method. The current method is `manual`; GPS, camera/AR and hybrid capture are not yet implemented.

## Storage and recovery

Records are stored in browser IndexedDB. Browser storage can be cleared or evicted; the app requests persistent storage where available but does not guarantee it. Users should export JSON backups and keep them outside the browser. Imports validate every ring before writing and use plot IDs as upsert keys.

## Test policy

Geometry tests should verify known shapes, invalid input rejection, millimetre quantization, winding invariance, and self-intersection handling. Plot-store regression tests cover save-edit-save identity, independent new records, invalid geometry rejection, repeated import without duplicate IDs, all-or-nothing validation before writes, and delete isolation.
