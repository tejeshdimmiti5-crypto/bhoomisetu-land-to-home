"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileUp, Home, Plus, Printer, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { validateFloorPlanRooms } from "../../lib/floor-plan";
import { checkFloorPlanFitsPlot } from "../../lib/plot-fit";
import { listPlots, type SavedPlot } from "../../lib/plot-store";
import { migrateLegacyFloorPlan, parseHouseDesignDocument, serializeHouseDesignDocument, type HouseDesignDocument } from "../../lib/house-design-document";
import { generatePlotLayoutCandidates, generateRectangularLayoutCandidates, type LayoutCandidate } from "../../lib/layout-candidates";
import { validateRoomOpenings, type OpeningKind, type RoomOpening, type WallSide } from "../../lib/room-openings";

type Room = { id: string; name: string; x: number; y: number; width: number; depth: number };
const STORAGE_KEY = "bhoomisetu-design-document-v1";
const LEGACY_STORAGE_KEY = "bhoomisetu-floor-plan-v1";
const OPENINGS_STORAGE_KEY = "bhoomisetu-room-openings-v1";
const starterRooms: Room[] = [
  { id: "living", name: "Living", x: 0, y: 0, width: 5, depth: 4 },
  { id: "bedroom-1", name: "Bedroom 1", x: 5, y: 0, width: 3.5, depth: 4 },
  { id: "kitchen", name: "Kitchen", x: 0, y: 4, width: 3, depth: 3 },
  { id: "bedroom-2", name: "Bedroom 2", x: 3, y: 4, width: 3.5, depth: 3 },
  { id: "bathroom", name: "Bathroom", x: 6.5, y: 4, width: 2, depth: 2 },
];

export default function DesignPage() {
  const [planName, setPlanName] = useState("My first home");
  const [rooms, setRooms] = useState<Room[]>(starterRooms);
  const [selectedId, setSelectedId] = useState("living");
  const [notice, setNotice] = useState("Edit room dimensions and positions. Changes are saved only in this browser.");
  const [loaded, setLoaded] = useState(false);
  const [savedPlots, setSavedPlots] = useState<SavedPlot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [plotsLoading, setPlotsLoading] = useState(true);
  const [candidatePlotWidth, setCandidatePlotWidth] = useState(10);
  const [candidatePlotDepth, setCandidatePlotDepth] = useState(15);
  const [layoutCandidates, setLayoutCandidates] = useState<LayoutCandidate[]>([]);
  const [openings, setOpenings] = useState<RoomOpening[]>([]);
  const [openingKind, setOpeningKind] = useState<OpeningKind>("door");
  const [openingWall, setOpeningWall] = useState<WallSide>("south");
  const [openingOffset, setOpeningOffset] = useState(0.5);
  const [openingWidth, setOpeningWidth] = useState(0.9);
  const [openingsNotice, setOpeningsNotice] = useState("Door and window markers are stored separately from room geometry.");

  useEffect(() => {
    try {
      const canonicalRaw = window.localStorage.getItem(STORAGE_KEY);
      if (canonicalRaw) {
        const parsed = parseHouseDesignDocument(canonicalRaw);
        if (!parsed.valid || !parsed.document) {
          setNotice(`Saved design was not loaded: ${parsed.errors[0] ?? "unsupported document"} Export or recover a backup before saving over it.`);
          setLoaded(true);
          return;
        }
        setRooms(parsed.document.rooms);
        setPlanName(parsed.document.name);
        setSelectedId(parsed.document.rooms[0].id);
        setSelectedPlotId(parsed.document.linkedPlotId ?? "");
        setNotice("Restored your canonical design document from this browser.");
      } else {
        const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw) as unknown;
          const migrated = migrateLegacyFloorPlan(legacy, { id: `design-${Date.now()}` });
          if (!migrated.valid || !migrated.document) {
            setNotice(`Legacy plan was not migrated: ${migrated.errors[0] ?? "invalid plan"}. Your original data was left untouched.`);
            setLoaded(true);
            return;
          }
          setRooms(migrated.document.rooms);
          setPlanName(migrated.document.name);
          setSelectedId(migrated.document.rooms[0].id);
          setNotice("Loaded your older plan without changing its room geometry. Save to create the new versioned design record.");
        }
      }
    } catch {
      setNotice("Could not restore the previous plan. Original browser data was left untouched.");
    }
    try {
      const rawOpenings = window.localStorage.getItem(OPENINGS_STORAGE_KEY);
      if (rawOpenings) {
        const parsedOpenings: unknown = JSON.parse(rawOpenings);
        if (Array.isArray(parsedOpenings) && parsedOpenings.length <= 200 &&
            parsedOpenings.every((item) => item && typeof item === "object" &&
              typeof item.id === "string" && typeof item.roomId === "string" &&
              (item.kind === "door" || item.kind === "window") &&
              ["north", "east", "south", "west"].includes(item.wall) &&
              typeof item.offsetM === "number" && Number.isFinite(item.offsetM) &&
              typeof item.widthM === "number" && Number.isFinite(item.widthM))) {
          setOpenings(parsedOpenings as RoomOpening[]);
        } else {
          setOpeningsNotice("Saved opening data has an unsupported shape and was not loaded.");
        }
      }
    } catch {
      setOpeningsNotice("Saved opening data could not be read; original browser data was left untouched.");
    }
    setLoaded(true);
  }, []);

  async function reloadPlots() {
    setPlotsLoading(true);
    try {
      const plots = await listPlots();
      setSavedPlots(plots);
      setSelectedPlotId((current) => plots.some((plot) => plot.id === current) ? current : "");
      setNotice(plots.length
        ? `Loaded ${plots.length} saved plot${plots.length === 1 ? "" : "s"} from this browser.`
        : "No saved plots found. Save a boundary in Land Studio first.");
    } catch {
      setNotice("Saved plots could not be loaded in this browser. You can still edit a concept plan.");
    } finally {
      setPlotsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listPlots().then((plots) => {
      if (active) setSavedPlots(plots);
    }).catch(() => {
      if (active) setNotice("Saved plots could not be loaded in this browser. You can still edit a concept plan.");
    }).finally(() => {
      if (active) setPlotsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selectedPlot = savedPlots.find((plot) => plot.id === selectedPlotId);
  const plotFit = useMemo(() => selectedPlot ? checkFloorPlanFitsPlot(selectedPlot.ring, rooms) : null, [selectedPlot, rooms]);
  const selected = rooms.find((room) => room.id === selectedId) ?? rooms[0];
  const planBounds = useMemo(() => ({
    width: Math.max(1, ...rooms.map((room) => room.x + room.width)),
    depth: Math.max(1, ...rooms.map((room) => room.y + room.depth)),
  }), [rooms]);
  const validation = useMemo(() => validateFloorPlanRooms(rooms), [rooms]);
  const totalArea = validation.totalRoomAreaM2;
  const hasOverlap = validation.overlappingRoomIds.length > 0;
  const openingValidation = useMemo(() => validateRoomOpenings(rooms, openings), [rooms, openings]);

  function updateSelected(field: "name" | "x" | "y" | "width" | "depth", value: string) {
    if (!selected) return;
    setRooms((current) => current.map((room) => room.id !== selected.id ? room : {
      ...room,
      [field]: field === "name" ? value.slice(0, 40) : (value.trim() === "" ? 0 : Number(value)),
    }));
  }

  function selectPlot(plotId: string) {
    setSelectedPlotId(plotId);
    const plot = savedPlots.find((item) => item.id === plotId);
    if (!plot) return;
    const xs = plot.ring.map(([x]) => x);
    const ys = plot.ring.map(([, y]) => y);
    const width = Math.max(...xs) - Math.min(...xs);
    const depth = Math.max(...ys) - Math.min(...ys);
    if (Number.isFinite(width) && width > 0) setCandidatePlotWidth(Number(width.toFixed(2)));
    if (Number.isFinite(depth) && depth > 0) setCandidatePlotDepth(Number(depth.toFixed(2)));
  }

  function generateCandidates() {
    const requirements = rooms.map(({ id, name, width, depth }) => ({ id, name, width, depth }));
    const generated = selectedPlot
      ? generatePlotLayoutCandidates(requirements, selectedPlot.ring)
      : generateRectangularLayoutCandidates(requirements, candidatePlotWidth, candidatePlotDepth);
    setLayoutCandidates(generated);
    if (generated.length === 0) {
      setNotice("Could not generate candidates. Check that every room has a valid name and dimensions, and that the rectangular plot dimensions are positive.");
    } else {
      const fitting = generated.filter((candidate) => candidate.valid).length;
      setNotice(`Generated ${generated.length} deterministic concept layouts; ${fitting} fit ${selectedPlot ? "the saved plot boundary" : "the entered rectangle"}. Review each candidate before applying it.`);
    }
  }

  function applyCandidate(candidate: LayoutCandidate) {
    if (!candidate.valid) {
      setNotice("This candidate does not fit the entered rectangle. Choose a valid candidate or change the room/plot dimensions.");
      return;
    }
    setRooms(candidate.rooms);
    setSelectedId(candidate.rooms[0]?.id ?? "");
    setLayoutCandidates([]);
    setNotice(`Applied the ${candidate.strategy} concept layout. Review the room positions and plot fit, then save if you want to keep it.`);
  }

  function addRoom() {
    if (rooms.length >= 40) { setNotice("This editor supports up to 40 rooms per plan."); return; }
    const id = `room-${Date.now()}`;
    const room: Room = { id, name: `Room ${rooms.length + 1}`, x: 0, y: planBounds.depth, width: 3, depth: 3 };
    setRooms((current) => [...current, room]);
    setSelectedId(id);
    setNotice("Room added. Adjust its position and dimensions in the editor.");
  }

  function addOpening() {
    if (!selected) { setOpeningsNotice("Select a room before adding a door or window."); return; }
    if (openings.length >= 200) { setOpeningsNotice("This concept editor supports up to 200 openings."); return; }
    const wallLength = openingWall === "north" || openingWall === "south" ? selected.width : selected.depth;
    if (!Number.isFinite(openingOffset) || openingOffset < 0 || !Number.isFinite(openingWidth) || openingWidth <= 0 || openingOffset + openingWidth > wallLength + 1e-9) {
      setOpeningsNotice(`Opening must fit fully on the selected wall (length ${wallLength.toFixed(2)} m). No values were changed.`);
      return;
    }
    const next: RoomOpening = { id: `opening-${Date.now()}-${openings.length}`, roomId: selected.id, kind: openingKind, wall: openingWall, offsetM: Number(openingOffset.toFixed(2)), widthM: Number(openingWidth.toFixed(2)) };
    const candidate = [...openings, next];
    const checked = validateRoomOpenings(rooms, candidate);
    if (!checked.valid) { setOpeningsNotice(checked.errors[0] ?? "Opening placement is invalid."); return; }
    setOpenings(candidate);
    setOpeningsNotice(`Added a ${openingKind} on the ${openingWall} wall of ${selected.name}. Save openings to keep the change.`);
    setOpeningsNotice(`Added a ${openingKind} on the ${openingWall} wall of ${selected.name}. Save openings to keep the change.`);
  }

  function saveOpenings() {
    const checked = validateRoomOpenings(rooms, openings);
    if (!checked.valid) { setOpeningsNotice(checked.errors[0] ?? "Correct invalid openings before saving."); return; }
    try {
      window.localStorage.setItem(OPENINGS_STORAGE_KEY, JSON.stringify(openings));
      setOpeningsNotice(`Saved ${openings.length} door/window marker(s) in this browser. These are concept markers, not construction details.`);
    } catch {
      setOpeningsNotice("Browser storage is unavailable or full. Opening changes were not saved.");
    }
  }

  function exportOpenings() {
    const checked = validateRoomOpenings(rooms, openings);
    if (!checked.valid) { setOpeningsNotice(checked.errors[0] ?? "Correct invalid openings before exporting."); return; }
    try {
      const blob = new Blob([JSON.stringify({ schemaVersion: 1, openings }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = "bhoomisetu-openings.json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpeningsNotice("Door/window backup exported. Keep it with the matching room design.");
    } catch {
      setOpeningsNotice("Could not export opening backup.");
    }
  }

  async function importOpenings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 200 * 1024) { setOpeningsNotice("Opening backup must be 200 KB or smaller."); return; }
    try {
      const raw: unknown = JSON.parse(await file.text());
      const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as { schemaVersion?: unknown; openings?: unknown } : null;
      if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.openings) || payload.openings.length > 200) {
        setOpeningsNotice("Opening backup rejected: unsupported format or too many openings.");
        return;
      }
      const checked = validateRoomOpenings(rooms, payload.openings);
      if (!checked.valid) { setOpeningsNotice(checked.errors[0] ?? "Opening backup does not match this room plan."); return; }
      window.localStorage.setItem(OPENINGS_STORAGE_KEY, JSON.stringify(payload.openings));
      setOpenings(payload.openings as RoomOpening[]);
      setOpeningsNotice("Opening backup validated and imported. Match it with the same room IDs/design.");
    } catch {
      setOpeningsNotice("Could not import this opening backup. Original saved data was left unchanged.");
    }
  }

  function removeOpening(id: string) {
    setOpenings((current) => current.filter((opening) => opening.id !== id));
    setOpeningsNotice("Opening removed from the editor. Save openings to keep the change.");
  }

  function printPlan() {
    if (!validation.valid) {
      setNotice(validation.errors[0] ?? "Please correct the room layout before printing.");
      return;
    }
    window.print();
  }

  function createDocument(): HouseDesignDocument {
    const now = new Date().toISOString();
    let existingId = `design-${Date.now()}`;
    let createdAt = now;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const existing = parseHouseDesignDocument(raw);
        if (existing.valid && existing.document) {
          existingId = existing.document.id;
          createdAt = existing.document.createdAt;
        }
      }
    } catch { /* A fresh ID is safe when no readable canonical record exists. */ }
    return {
      schemaVersion: 1,
      id: existingId,
      name: planName.trim() || "My home",
      units: "metres",
      coordinateSystem: "local-planar",
      linkedPlotId: selectedPlotId || null,
      rooms,
      createdAt,
      updatedAt: now,
    };
  }

  function savePlan() {
    if (!validation.valid) { setNotice(validation.errors[0] ?? "Please correct the room layout before saving."); return; }
    try {
      const document = createDocument();
      window.localStorage.setItem(STORAGE_KEY, serializeHouseDesignDocument(document));
      setNotice(`Saved “${document.name}” as a versioned design document in this browser.`);
    } catch {
      setNotice("Browser storage is unavailable or full. Export a JSON backup instead.");
    }
  }

  function resetPlan() {
    setRooms(starterRooms);
    setSelectedId(starterRooms[0].id);
    setPlanName("My first home");
    setNotice("Sample layout restored in the editor. Save it to keep it in this browser.");
  }

  function exportPlan() {
    if (!validation.valid) { setNotice(validation.errors[0] ?? "Please correct the room layout before exporting."); return; }
    try {
      const json = serializeHouseDesignDocument(createDocument());
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bhoomisetu-design-document.json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Versioned design document exported. Keep the file as a backup.");
    } catch {
      setNotice("Could not export an invalid design document. Correct the layout and try again.");
    }
  }

  async function importPlan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) { setNotice("Plan backup must be 1 MB or smaller."); return; }
    try {
      const raw = await file.text();
      let parsed = parseHouseDesignDocument(raw);
      if (!parsed.valid || !parsed.document) {
        let legacy: unknown;
        try { legacy = JSON.parse(raw); } catch { legacy = null; }
        const migrated = migrateLegacyFloorPlan(legacy, { id: `design-${Date.now()}`, linkedPlotId: selectedPlotId || null });
        if (!migrated.valid || !migrated.document) {
          setNotice(`Backup rejected: ${parsed.errors[0] ?? migrated.errors[0] ?? "unsupported design format"}`);
          return;
        }
        parsed = { valid: true, errors: [], document: migrated.document };
      }
      const document = parsed.document;
      if (!document || !document.rooms.length) {
        setNotice("Backup rejected: at least one room is required.");
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, serializeHouseDesignDocument(document));
      setPlanName(document.name);
      setRooms(document.rooms);
      setSelectedId(document.rooms[0].id);
      setSelectedPlotId(document.linkedPlotId ?? "");
      setNotice(`Imported and saved “${document.name}” in this browser. Geometry was not auto-corrected.`);
    } catch (cause) {
      setNotice(cause instanceof Error && cause.name === "QuotaExceededError"
        ? "Browser storage is full. Export or remove old data before importing."
        : "Could not import this file. Check that it is valid JSON and uses the supported design format.");
    }
  }

  function removeRoom() {
    if (!selected || rooms.length <= 1) { setNotice("A plan must contain at least one room."); return; }
    const next = rooms.filter((room) => room.id !== selected.id);
    setRooms(next);
    setOpenings((current) => current.filter((opening) => opening.roomId !== selected.id));
    setSelectedId(next[0].id);
    setNotice("Room removed. Save the plan to keep this change.");
  }

  return (
    <main className="design-page">
      <header className="design-header">
        <Link className="design-back" href="/"><ArrowLeft size={16}/> Workspace</Link>
        <div><span className="design-eyebrow">BHOOMISETU · HOME DESIGN</span><h1>Shape your home</h1><p>Build a simple, editable 2D room layout. Dimensions are in metres.</p></div>
        <span className="design-local-badge">Browser-local prototype</span>
      </header>
      <div className="design-notice" role="status">{notice}</div>
      <div className="design-layout">
        <section className="design-card design-canvas-card">
          <div className="design-card-head"><div><span className="design-kicker">2D FLOOR PLAN</span><h2>{planName || "Untitled home"}</h2></div><span className="design-room-count">{rooms.length} rooms</span></div>
          <div className="design-canvas-wrap">
            <svg viewBox={`0 0 ${Math.max(380, planBounds.width * 55 + 60, (plotFit?.plotBounds.width ?? 0) * 55 + 60)} ${Math.max(300, planBounds.depth * 55 + 60, (plotFit?.plotBounds.depth ?? 0) * 55 + 60)}`} role="img" aria-label="Editable 2D room layout preview">
              <defs><pattern id="design-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e7ede4" strokeWidth="0.8"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#design-grid)"/>
              <g className="design-dimension-guides" fill="none" stroke="#7d9280" strokeWidth="1">
                <line x1="30" y1="19" x2={30 + planBounds.width * 55} y2="19"/>
                <line x1="30" y1="14" x2="30" y2="24"/>
                <line x1={30 + planBounds.width * 55} y1="14" x2={30 + planBounds.width * 55} y2="24"/>
                <line x1="18" y1="30" x2="18" y2={30 + planBounds.depth * 55}/>
                <line x1="13" y1="30" x2="23" y2="30"/>
                <line x1="13" y1={30 + planBounds.depth * 55} x2="23" y2={30 + planBounds.depth * 55}/>
              </g>
              <g fill="#536b58" fontSize="10" fontWeight="600">
                <text x={30 + planBounds.width * 27.5} y="12" textAnchor="middle">{planBounds.width.toFixed(2)} m</text>
                <text x="10" y={30 + planBounds.depth * 27.5} textAnchor="middle" transform={`rotate(-90 10 ${30 + planBounds.depth * 27.5})`}>{planBounds.depth.toFixed(2)} m</text>
              </g>
              {selectedPlot && <polygon
                points={selectedPlot.ring.map(([x, y]) => `${30 + (x - (plotFit?.plotBounds.minX ?? 0)) * 55},${30 + (y - (plotFit?.plotBounds.minY ?? 0)) * 55}`).join(" ")}
                fill="#dce8f2" fillOpacity="0.38" stroke="#527a9c" strokeWidth="3" strokeDasharray="8 5"
              />}
              {rooms.map((room, index) => <g key={room.id} onClick={() => setSelectedId(room.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(room.id); } }} role="button" tabIndex={0} aria-label={`Select ${room.name}, ${room.width} by ${room.depth} metres`} aria-pressed={room.id === selectedId} style={{cursor:"pointer"}}>
                <rect x={30 + room.x * 55} y={30 + room.y * 55} width={room.width * 55} height={room.depth * 55} fill={validation.overlappingRoomIds.includes(room.id) ? "#f7dfd7" : room.id === selectedId ? "#d8e9d4" : (index % 2 ? "#f4eee2" : "#e8f0e5")} stroke={validation.overlappingRoomIds.includes(room.id) ? "#b65b43" : room.id === selectedId ? "#315d48" : "#8ca48c"} strokeWidth={room.id === selectedId ? 3 : 1.8}/>
                {room.width * 55 >= 82 && room.depth * 55 >= 40 && <text x={30 + (room.x + room.width / 2) * 55} y={30 + (room.y + room.depth / 2) * 55 - 5} textAnchor="middle" fontSize={room.width < 2.4 ? "9" : room.width < 3 ? "10" : "12"} fill="#344d39" fontWeight="600">{room.name.length > Math.max(7, Math.floor(room.width * 3.1)) ? room.name.slice(0, Math.max(6, Math.floor(room.width * 3.1) - 1)) + "…" : room.name}</text>}
                {room.width * 55 >= 82 && room.depth * 55 >= 40 && <text x={30 + (room.x + room.width / 2) * 55} y={30 + (room.y + room.depth / 2) * 55 + 12} textAnchor="middle" fontSize="9" fill="#708574">{room.width.toFixed(1)} × {room.depth.toFixed(1)} m</text>}
              </g>)}
              {openings.map((opening) => {
                const room = rooms.find((item) => item.id === opening.roomId);
                if (!room) return null;
                const start = opening.offsetM * 55;
                const length = opening.widthM * 55;
                const x1 = opening.wall === "west" ? 30 + room.x * 55 : opening.wall === "east" ? 30 + (room.x + room.width) * 55 : 30 + room.x * 55 + start;
                const y1 = opening.wall === "north" ? 30 + room.y * 55 : opening.wall === "south" ? 30 + (room.y + room.depth) * 55 : 30 + room.y * 55 + start;
                const x2 = opening.wall === "west" || opening.wall === "east" ? x1 : x1 + length;
                const y2 = opening.wall === "north" || opening.wall === "south" ? y1 : y1 + length;
                return <g key={opening.id} aria-label={`${opening.kind} on ${room.name} ${opening.wall} wall`}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={opening.kind === "door" ? "#b66b3c" : "#3183ad"} strokeWidth="5" strokeLinecap="butt"/><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="1.2" strokeDasharray={opening.kind === "door" ? "2 2" : "4 2"}/></g>;
              })}
            </svg>
          </div>
          <div className="design-summary">
            <div><span>Combined room area</span><strong>{totalArea.toFixed(2)} m²</strong></div>
            <div><span>Approx. footprint bounds</span><strong>{planBounds.width.toFixed(2)} × {planBounds.depth.toFixed(2)} m</strong></div>
            <div><span>Layout checks</span><strong className={hasOverlap ? "design-warning-text" : "design-ok-text"}>{hasOverlap ? `Overlap: ${validation.overlappingRoomIds.length} rooms` : "No room overlap"}</strong></div>
          </div>
          <p className="design-disclaimer">Concept layout only: this does not include wall thickness, doors, windows, structural columns, setbacks, ventilation, building codes or architect approval. Room area is summed from room rectangles and is not a certified built-up area.</p>
        </section>
        <aside className="design-card design-editor-card">
          <div className="design-card-head"><div><span className="design-kicker">PLAN SETTINGS</span><h2>Make it yours</h2></div><Home size={19} color="#658369"/></div>
          <label className="design-label" htmlFor="design-name">Plan name</label>
          <input id="design-name" className="design-input" maxLength={100} value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="My family home"/>
          <div className="design-room-toolbar"><label className="design-label" htmlFor="design-plot">Measured plot boundary</label><button type="button" onClick={reloadPlots} disabled={plotsLoading} aria-label="Refresh saved plots"><RefreshCw size={14}/> {plotsLoading ? "Loading…" : "Refresh plots"}</button></div>
          <select id="design-plot" className="design-input" value={selectedPlotId} onChange={(event) => selectPlot(event.target.value)}>
            <option value="">No plot selected — concept mode</option>
            {savedPlots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name} · {plot.areaM2.toFixed(2)} m² · {plot.measurementMethod === "gps" ? "GPS estimate" : "Manual"}</option>)}
          </select>
          {plotsLoading && <p className="design-storage-note">Loading saved plots from this browser…</p>}
          {!plotsLoading && savedPlots.length === 0 && <p className="design-storage-note">No saved plots found. Save a boundary in Land Studio first.</p>}
          {selectedPlot && plotFit && <div className="design-plot-fit" role="status">
            <strong className={plotFit.fits ? "design-ok-text" : "design-warning-text"}>{plotFit.fits ? "Rooms fit inside plot boundary" : "Layout does not fit plot boundary"}</strong>
            <p>Selected plot: {selectedPlot.name} · {selectedPlot.areaM2.toFixed(2)} m² · {selectedPlot.measurementMethod === "gps" ? "GPS-based estimate" : "Manually marked boundary"}</p>
            <ul>{plotFit.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
            <p className="design-storage-note">Geometric estimate only. GPS-projected coordinates can be inaccurate and are not a legal survey. Layout origin is aligned to the plot’s minimum X/Y bounds. This does not check setbacks, access, regulations, or construction safety.</p>
          </div>}
          <section className="design-candidate-panel" aria-labelledby="candidate-layout-heading">
            <div className="design-room-toolbar"><strong id="candidate-layout-heading">Try layout candidates</strong><span className="design-storage-note">Experimental</span></div>
            <p className="design-storage-note">Creates simple row-packed concepts. When a saved plot is selected, candidates are checked against its actual polygon and use a small 0.1 m geometric inset. Without a selected plot, candidates are checked only against the entered rectangle. This is not a legal setback and does not check access, doors, circulation, ventilation, structure or regulations.</p>
            <div className="design-field-grid">
              <label className="design-label">Rectangular width (m)<input className="design-input" type="number" min="1" max="200" step="0.5" value={candidatePlotWidth} onChange={(event) => setCandidatePlotWidth(event.target.value.trim() === "" ? 0 : Number(event.target.value))}/></label>
              <label className="design-label">Rectangular depth (m)<input className="design-input" type="number" min="1" max="200" step="0.5" value={candidatePlotDepth} onChange={(event) => setCandidatePlotDepth(event.target.value.trim() === "" ? 0 : Number(event.target.value))}/></label>
            </div>
            <button type="button" className="design-export" onClick={generateCandidates}>Generate layout options</button>
            {layoutCandidates.length > 0 && <div className="design-candidate-list">
              {layoutCandidates.map((candidate) => <article className="design-candidate-option" key={candidate.strategy}>
                <div className="design-room-toolbar"><strong>{candidate.strategy === "requested-order" ? "Requested order" : candidate.strategy === "wide-first" ? "Wider rooms first" : candidate.strategy === "deep-first" ? "Deeper rooms first" : candidate.strategy === "compact-first" ? "Smaller rooms first" : candidate.strategy === "living-first" ? "Living areas first" : "Wet rooms first"}</strong><span className={candidate.valid ? "design-ok-text" : "design-warning-text"}>{candidate.valid ? (selectedPlot ? "Fits plot boundary" : "Fits rectangle") : "Does not fit"}</span></div>
                <p>{candidate.rooms.length} of {rooms.length} rooms placed · {selectedPlot ? "checked against saved plot boundary" : `${candidatePlotWidth} × ${candidatePlotDepth} m rectangle`}</p>
                {candidate.errors.length > 0 && <ul>{candidate.errors.slice(0, 3).map((error, index) => <li key={index}>{error}</li>)}</ul>}
                <button type="button" className="design-export" disabled={!candidate.valid} onClick={() => applyCandidate(candidate)}>Apply this candidate</button>
              </article>)}
            </div>}
          </section>
          <div className="design-room-toolbar"><strong>Rooms</strong><button type="button" onClick={addRoom} disabled={rooms.length >= 40}><Plus size={14}/> Add room</button></div>
          <div className="design-room-list">{rooms.map((room) => <button key={room.id} type="button" onClick={() => setSelectedId(room.id)} aria-pressed={room.id === selectedId} className={room.id === selectedId ? "design-room-option selected" : "design-room-option"}><span>{room.name}</span><small>{room.width} × {room.depth} m</small></button>)}</div>
          {selected && <div className="design-room-fields">
            <label className="design-label" htmlFor="room-name">Selected room</label>
            <input id="room-name" className="design-input" maxLength={40} value={selected.name} onChange={(event) => updateSelected("name", event.target.value)} />
            <div className="design-field-grid">
              <label className="design-label">X position (m)<input className="design-input" type="number" min="0" max="30" step="0.5" value={selected.x} onChange={(event) => updateSelected("x", event.target.value)}/></label>
              <label className="design-label">Y position (m)<input className="design-input" type="number" min="0" max="30" step="0.5" value={selected.y} onChange={(event) => updateSelected("y", event.target.value)}/></label>
              <label className="design-label">Width (m)<input className="design-input" type="number" min="1" max="15" step="0.5" value={selected.width} onChange={(event) => updateSelected("width", event.target.value)}/></label>
              <label className="design-label">Depth (m)<input className="design-input" type="number" min="1" max="15" step="0.5" value={selected.depth} onChange={(event) => updateSelected("depth", event.target.value)}/></label>
            </div>
            <button className="design-remove-room" type="button" onClick={removeRoom} disabled={rooms.length <= 1}><Trash2 size={14}/> Remove selected room</button>
          </div>}
          <section className="design-candidate-panel" aria-labelledby="openings-heading">
            <div className="design-room-toolbar"><strong id="openings-heading">Doors & windows</strong><span className="design-storage-note">{openings.length} markers</span></div>
            <p className="design-storage-note">Add simple wall markers to the selected room. Brown marks are doors; blue marks are windows. This prototype checks wall lengths and marker overlaps only—not wall construction, egress, ventilation, or code compliance.</p>
            <div className="design-field-grid">
              <label className="design-label">Type<select className="design-input" value={openingKind} onChange={(event) => { const kind = event.target.value as OpeningKind; setOpeningKind(kind); setOpeningWidth(kind === "door" ? 0.9 : 1.2); }}><option value="door">Door</option><option value="window">Window</option></select></label>
              <label className="design-label">Wall<select className="design-input" value={openingWall} onChange={(event) => setOpeningWall(event.target.value as WallSide)}><option value="north">North / top</option><option value="east">East / right</option><option value="south">South / bottom</option><option value="west">West / left</option></select></label>
              <label className="design-label">Offset (m)<input className="design-input" type="number" min="0" step="0.1" value={openingOffset} onChange={(event) => setOpeningOffset(event.target.value.trim() === "" ? 0 : Number(event.target.value))}/></label>
              <label className="design-label">Width (m)<input className="design-input" type="number" min="0.1" step="0.1" value={openingWidth} onChange={(event) => setOpeningWidth(event.target.value.trim() === "" ? 0 : Number(event.target.value))}/></label>
            </div>
            <button type="button" className="design-export" onClick={addOpening} disabled={!selected}>Add to selected room</button>
            <button type="button" className="design-save" onClick={saveOpenings} disabled={!loaded || !openingValidation.valid}><Save size={15}/> Save doors & windows</button>
            <div className="design-room-toolbar">
              <button type="button" className="design-export" onClick={exportOpenings}><Download size={14}/> Export openings</button>
              <label className="design-export design-import-label"><FileUp size={14}/> Import openings<input type="file" accept="application/json,.json" onChange={importOpenings}/></label>
            </div>
            <div role="status" className="design-storage-note">{openingsNotice}</div>
            {!openingValidation.valid && <ul className="design-warning-text">{openingValidation.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
            {openings.length > 0 && <div className="design-room-list">{openings.map((opening) => {
              const room = rooms.find((item) => item.id === opening.roomId);
              return <div key={opening.id} className="design-room-option"><span>{opening.kind} · {room?.name ?? "Unknown room"} · {opening.wall}</span><small>{opening.offsetM} m offset · {opening.widthM} m wide <button type="button" onClick={() => removeOpening(opening.id)} aria-label={`Remove ${opening.kind}`}>Remove</button></small></div>;
            })}</div>}
          </section>
          <div className="design-actions"><button type="button" className="design-save" onClick={savePlan} disabled={!loaded}><Save size={15}/> Save plan</button><button type="button" className="design-export" onClick={printPlan}><Printer size={15}/> Print / Save PDF</button><button type="button" className="design-export" onClick={exportPlan}><Download size={15}/> Export JSON</button><label className="design-export design-import-label"><FileUp size={15}/> Import JSON<input type="file" accept="application/json,.json" onChange={importPlan}/></label><button type="button" className="design-reset" onClick={resetPlan}><RotateCcw size={14}/> Reset sample</button></div>
          <p className="design-storage-note">Versioned design saved in this browser only. Older plans remain available as a legacy backup; export JSON before clearing browser data.</p>
        </aside>
      </div>
      <footer className="design-footer"><Link href="/studio">← Back to Land Studio</Link><span>2D concept editor · Not construction-ready</span></footer>
    </main>
  );
}
