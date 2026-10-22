"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileUp, Home, Plus, Printer, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { buildFloorPlanAnnotations, validateFloorPlanRooms } from "../../lib/floor-plan";
import { checkFloorPlanFitsPlot } from "../../lib/plot-fit";
import { listPlots, type SavedPlot } from "../../lib/plot-store";
import { migrateLegacyFloorPlan, parseHouseDesignDocument, serializeHouseDesignDocument, type HouseDesignDocument } from "../../lib/house-design-document";
import { generatePlotLayoutCandidates, generateRectangularLayoutCandidates, type LayoutCandidate } from "../../lib/layout-candidates";
import { validateRoomOpenings, type OpeningKind, type RoomOpening, type WallSide } from "../../lib/room-openings";
import HouseRequirementsWizard, { type RequirementRoom } from "./requirements-wizard";

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
  const [requirementsOpen, setRequirementsOpen] = useState(false);

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
  const annotationData = useMemo(() => buildFloorPlanAnnotations(rooms), [rooms]);
  const totalArea = validation.totalRoomAreaM2;
  const hasOverlap = validation.overlappingRoomIds.length > 0;
  const openingValidation = useMemo(() => validateRoomOpenings(rooms, openings), [rooms, openings]);
  const dimensionScale = 55;
  const dimOriginX = 82;
  const dimOriginY = 82;
  const svgWidth = Math.max(540, dimOriginX * 2 + planBounds.width * dimensionScale + 120);
  const svgHeight = Math.max(430, dimOriginY * 2 + planBounds.depth * dimensionScale + 120);
  const roomDimensionMap = new Map(annotationData.roomLabels.map((label) => [label.id, label.label]));

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

  function applyRequirements(requirementRooms: RequirementRoom[], style: string, special: string) {
    if (requirementRooms.length === 0 || requirementRooms.length > 40) {
      setNotice("Choose between 1 and 40 spaces before generating a layout.");
      return;
    }
    setPlanName(`${style.split(" · ")[0]} family home`);
    const requirements = requirementRooms.map(({ id, name, width, depth }) => ({ id, name, width, depth }));
    const generated = selectedPlot
      ? generatePlotLayoutCandidates(requirements, selectedPlot.ring)
      : generateRectangularLayoutCandidates(requirements, candidatePlotWidth, candidatePlotDepth);
    const firstValidCandidate = generated.find((candidate) => candidate.valid);
    const previewRooms = firstValidCandidate?.rooms ?? requirementRooms;
    setRooms(previewRooms);
    setSelectedId(previewRooms[0]?.id ?? "");
    setLayoutCandidates(generated);
    setRequirementsOpen(false);
    if (generated.length === 0) {
      setNotice("Your room requirements were created, but no candidates could be generated. Check plot dimensions and room sizes.");
    } else {
      const fitting = generated.filter((candidate) => candidate.valid).length;
      const preferenceNote = special.trim() ? ` Special request recorded for review: ${special.trim()}.` : "";
      setNotice(`Created ${requirementRooms.length} requested spaces in a ${style.split(" · ")[0]} concept and generated ${generated.length} layout options; ${fitting} fit the current ${selectedPlot ? "saved plot boundary" : "rectangular dimensions"}.${preferenceNote} Review before applying.`);
    }
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
      setNotice(`Generated ${generated.length} deterministic concept layouts; ${fitting} fit ${selectedPlot ? "the saved plot boundary" : "the entered rectangle"}. Review each candidate before applying one.`);
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
        <button type="button" className="design-wizard-trigger" onClick={() => setRequirementsOpen((open) => !open)}><Home size={15}/>{requirementsOpen ? "Close home planner" : "Plan from my requirements"}</button>
      </header>
      <div className="design-notice" role="status">{notice}</div>
      {requirementsOpen && <HouseRequirementsWizard onGenerate={(requirementRooms, style) => applyRequirements(requirementRooms, style, style.includes(" · Special requests: ") ? style.split(" · Special requests: ").slice(1).join(" · ") : "")} onCancel={() => setRequirementsOpen(false)} />}
      <div className="design-layout">
        <section className="design-card design-canvas-card">
          <div className="design-card-head"><div><span className="design-kicker">2D FLOOR PLAN</span><h2>{planName || "Untitled home"}</h2></div><span className="design-room-count">{rooms.length} rooms</span></div>
          <div className="design-canvas-wrap">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} role="img" aria-label={`Dimensioned floor plan for ${planName || "untitled home"}`} style={{ width: "100%", height: "100%", maxHeight: 620 }}>
              <defs>
                <pattern id="design-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e7ede4" strokeWidth="0.8"/></pattern>
                <marker id="dimension-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#49685a"/>
                </marker>
              </defs>
              <rect width={svgWidth} height={svgHeight} fill="url(#design-grid)" rx="14"/>
              <g fill="none" stroke="#49685a" strokeWidth="1.4" markerStart="url(#dimension-arrow)" markerEnd="url(#dimension-arrow)">
                <line x1={dimOriginX} y1={dimOriginY - 28} x2={dimOriginX + planBounds.width * dimensionScale} y2={dimOriginY - 28} />
                <line x1={dimOriginX} y1={dimOriginY - 34} x2={dimOriginX} y2={dimOriginY - 18} />
                <line x1={dimOriginX + planBounds.width * dimensionScale} y1={dimOriginY - 34} x2={dimOriginX + planBounds.width * dimensionScale} y2={dimOriginY - 18} />
                <line x1={dimOriginX - 28} y1={dimOriginY} x2={dimOriginX - 28} y2={dimOriginY + planBounds.depth * dimensionScale} />
                <line x1={dimOriginX - 34} y1={dimOriginY} x2={dimOriginX - 18} y2={dimOriginY} />
                <line x1={dimOriginX - 34} y1={dimOriginY + planBounds.depth * dimensionScale} x2={dimOriginX - 18} y2={dimOriginY + planBounds.depth * dimensionScale} />
              </g>
              <g fill="#2f4f45" fontSize="11" fontWeight="700">
                <text x={dimOriginX + (planBounds.width * dimensionScale) / 2} y={dimOriginY - 40} textAnchor="middle">{annotationData.overallLabel}</text>
                <text x={dimOriginX - 46} y={dimOriginY + (planBounds.depth * dimensionScale) / 2} textAnchor="middle" transform={`rotate(-90 ${dimOriginX - 46} ${dimOriginY + (planBounds.depth * dimensionScale) / 2})`}>{annotationData.overallLabel.split("×")[1]?.trim() ?? annotationData.overallLabel}</text>
              </g>
              {selectedPlot && <polygon
                points={selectedPlot.ring.map(([x, y]) => `${dimOriginX + (x - (plotFit?.plotBounds.minX ?? 0)) * dimensionScale},${dimOriginY + (y - (plotFit?.plotBounds.minY ?? 0)) * dimensionScale}`).join(" ")}
                fill="#dce8f2" fillOpacity="0.38" stroke="#527a9c" strokeWidth="3" strokeDasharray="8 5"
              />}
              {rooms.map((room) => {
                const left = dimOriginX + room.x * dimensionScale;
                const top = dimOriginY + room.y * dimensionScale;
                const widthPx = room.width * dimensionScale;
                const depthPx = room.depth * dimensionScale;
                const label = roomDimensionMap.get(room.id) ?? `${room.name}: ${room.width.toFixed(2)} m × ${room.depth.toFixed(2)} m`;
                const insideLabel = widthPx >= 120 && depthPx >= 70;
                const isSelected = room.id === selectedId;
                const roomFill = validation.overlappingRoomIds.includes(room.id) ? "#f7dfd7" : isSelected ? "#d8ead2" : "#edf3e7";
                return (
                  <g key={room.id} onClick={() => setSelectedId(room.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(room.id); } }} tabIndex={0} role="button" aria-label={`${room.name} room, ${room.width.toFixed(2)} by ${room.depth.toFixed(2)} metres`}>
                    <rect x={left} y={top} width={widthPx} height={depthPx} fill={roomFill} stroke={isSelected ? "#375f4d" : "#2d4a39"} strokeWidth={isSelected ? 2.4 : 1.8} rx="4"/>
                    <g fill="#2a3c30" fontSize={insideLabel ? 10 : 9} fontWeight={700}>
                      {insideLabel ? (
                        <>
                          <text x={left + widthPx / 2} y={top + depthPx / 2 - 4} textAnchor="middle">{room.name}</text>
                          <text x={left + widthPx / 2} y={top + depthPx / 2 + 10} textAnchor="middle">{label.replace(`${room.name}: `, "")}</text>
                        </>
                      ) : (
                        <text x={left + widthPx / 2} y={top - 12} textAnchor="middle">{label}</text>
                      )}
                    </g>
                    <g fill="none" stroke="#4d6352" strokeWidth="1.25" markerStart="url(#dimension-arrow)" markerEnd="url(#dimension-arrow)">
                      <line x1={left} y1={top - 18} x2={left + widthPx} y2={top - 18} />
                      <line x1={left} y1={top - 24} x2={left} y2={top - 12} />
                      <line x1={left + widthPx} y1={top - 24} x2={left + widthPx} y2={top - 12} />
                      <line x1={left - 18} y1={top} x2={left - 18} y2={top + depthPx} />
                      <line x1={left - 24} y1={top} x2={left - 12} y2={top} />
                      <line x1={left - 24} y1={top + depthPx} x2={left - 12} y2={top + depthPx} />
                    </g>
                  </g>
                );
              })}
              {openings.map((opening) => {
                const room = rooms.find((item) => item.id === opening.roomId);
                if (!room) return null;
                const x = dimOriginX + room.x * dimensionScale;
                const y = dimOriginY + room.y * dimensionScale;
                const start = opening.offsetM * dimensionScale;
                const length = opening.widthM * dimensionScale;
                const x1 = opening.wall === "west" ? x : opening.wall === "east" ? x + room.width * dimensionScale : x + start;
                const y1 = opening.wall === "north" ? y : opening.wall === "south" ? y + room.depth * dimensionScale : y + start;
                const x2 = opening.wall === "west" || opening.wall === "east" ? x1 : x1 + length;
                const y2 = opening.wall === "north" || opening.wall === "south" ? y1 : y1 + length;
                const isDoor = opening.kind === "door";
                const stroke = isDoor ? "#b66b3c" : "#3d77a8";
                const arcRadius = Math.max(14, length * 0.55);
                const arcX = isDoor ? x1 : x1;
                const arcY = isDoor ? y1 : y1;
                if (opening.wall === "north" || opening.wall === "south") {
                  return <g key={opening.id}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
                    <path d={`M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth="1.4" strokeDasharray="3 4"/>
                  </g>;
                }
                return <g key={opening.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
                  <path d={`M ${arcX} ${arcY} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth="1.4" strokeDasharray="3 4"/>
                </g>;
              })}
            </svg>
          </div>
          <div className="design-summary">
            <div><span>Combined room area</span><strong>{totalArea.toFixed(2)} m²</strong></div>
            <div><span>Approx. footprint bounds</span><strong>{planBounds.width.toFixed(2)} × {planBounds.depth.toFixed(2)} m</strong></div>
            <div><span>Layout checks</span><strong className={hasOverlap ? "design-warning-text" : "design-ok-text"}>{hasOverlap ? `Overlap: ${validation.overlappingRoomIds.length} rooms` : "No overlaps"}</strong></div>
          </div>
          <p className="design-disclaimer">Concept layout only: this does not include wall thickness, doors, windows, structural columns, setbacks, ventilation, building codes or architect approved details.</p>
        </section>
        <aside className="design-card design-editor-card">
          <div className="design-card-head"><div><span className="design-kicker">PLAN SETTINGS</span><h2>Make it yours</h2></div><Home size={19} color="#658369"/></div>
          <label className="design-label" htmlFor="design-name">Plan name</label>
          <input id="design-name" className="design-input" maxLength={100} value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="My family home"/>
          <div className="design-room-toolbar"><label className="design-label" htmlFor="design-plot">Measured plot boundary</label><button type="button" onClick={reloadPlots} disabled={plotsLoading}>Refresh</button></div>
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
            <p className="design-storage-note">Geometric estimate only. GPS-projected coordinates can be inaccurate and are not a legal survey. Layout origin is aligned to the plot’s minimum X/Y coordinates.</p>
          </div>}
          <section className="design-candidate-panel" aria-labelledby="candidate-layout-heading">
            <div className="design-room-toolbar"><strong id="candidate-layout-heading">Try layout candidates</strong><span className="design-storage-note">Experimental</span></div>
            <p className="design-storage-note">Creates simple row-packed concepts. When a saved plot is selected, candidates are checked against its actual polygon and use a small 0.1 m geometric tolerance.</p>
            <div className="design-field-grid">
              <label className="design-label">Rectangular width (m)<input className="design-input" type="number" min="1" max="200" step="0.5" value={candidatePlotWidth} onChange={(event) => setCandidatePlotWidth(Number(event.target.value) || 0)} /></label>
              <label className="design-label">Rectangular depth (m)<input className="design-input" type="number" min="1" max="200" step="0.5" value={candidatePlotDepth} onChange={(event) => setCandidatePlotDepth(Number(event.target.value) || 0)} /></label>
            </div>
            <button type="button" className="design-export" onClick={generateCandidates}>Generate layout options</button>
            {layoutCandidates.length > 0 && <div className="design-candidate-list">
              {layoutCandidates.map((candidate) => <article className="design-candidate-option" key={candidate.strategy}>
                <div className="design-room-toolbar"><strong>{candidate.strategy === "requested-order" ? "Requested order" : candidate.strategy === "wide-first" ? "Wider rooms first" : candidate.strategy === "deep-first" ? "Deeper rooms first" : candidate.strategy}</strong></div>
                <p>{candidate.rooms.length} of {rooms.length} rooms placed · {selectedPlot ? "checked against saved plot boundary" : `${candidatePlotWidth} × ${candidatePlotDepth} m rectangle`}</p>
                {candidate.errors.length > 0 && <ul>{candidate.errors.slice(0, 3).map((error, index) => <li key={index}>{error}</li>)}</ul>}
                <button type="button" className="design-export" disabled={!candidate.valid} onClick={() => applyCandidate(candidate)}>Apply this candidate</button>
              </article>)}
            </div>}
          </section>
          <div className="design-room-toolbar"><strong>Rooms</strong><button type="button" onClick={addRoom} disabled={rooms.length >= 40}><Plus size={14}/> Add room</button></div>
          <div className="design-room-list">{rooms.map((room) => <button key={room.id} type="button" onClick={() => setSelectedId(room.id)} aria-pressed={room.id === selectedId} className={room.id === selectedId ? "design-room-option selected" : "design-room-option"}>{room.name}</button>)}</div>
          {selected && <div className="design-room-fields">
            <label className="design-label" htmlFor="room-name">Selected room</label>
            <input id="room-name" className="design-input" maxLength={40} value={selected.name} onChange={(event) => updateSelected("name", event.target.value)} />
            <div className="design-field-grid">
              <label className="design-label">X position (m)<input className="design-input" type="number" min="0" max="30" step="0.5" value={selected.x} onChange={(event) => updateSelected("x", event.target.value)} /></label>
              <label className="design-label">Y position (m)<input className="design-input" type="number" min="0" max="30" step="0.5" value={selected.y} onChange={(event) => updateSelected("y", event.target.value)} /></label>
              <label className="design-label">Width (m)<input className="design-input" type="number" min="1" max="15" step="0.5" value={selected.width} onChange={(event) => updateSelected("width", event.target.value)} /></label>
              <label className="design-label">Depth (m)<input className="design-input" type="number" min="1" max="15" step="0.5" value={selected.depth} onChange={(event) => updateSelected("depth", event.target.value)} /></label>
            </div>
            <button className="design-remove-room" type="button" onClick={removeRoom} disabled={rooms.length <= 1}><Trash2 size={14}/> Remove selected room</button>
          </div>}
          <section className="design-candidate-panel" aria-labelledby="openings-heading">
            <div className="design-room-toolbar"><strong id="openings-heading">Doors & windows</strong><span className="design-storage-note">{openings.length} markers</span></div>
            <p className="design-storage-note">Add simple wall markers to the selected room. Brown marks are doors; blue marks are windows. This prototype checks wall lengths and marker overlaps against the room geometry.</p>
            <div className="design-field-grid">
              <label className="design-label">Type<select className="design-input" value={openingKind} onChange={(event) => { const kind = event.target.value as OpeningKind; setOpeningKind(kind); }}><option value="door">Door</option><option value="window">Window</option></select></label>
              <label className="design-label">Wall<select className="design-input" value={openingWall} onChange={(event) => setOpeningWall(event.target.value as WallSide)}><option value="north">North</option><option value="east">East</option><option value="south">South</option><option value="west">West</option></select></label>
              <label className="design-label">Offset (m)<input className="design-input" type="number" min="0" step="0.1" value={openingOffset} onChange={(event) => setOpeningOffset(Number(event.target.value) || 0)} /></label>
              <label className="design-label">Width (m)<input className="design-input" type="number" min="0.1" step="0.1" value={openingWidth} onChange={(event) => setOpeningWidth(Number(event.target.value) || 0)} /></label>
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
              return <div key={opening.id} className="design-room-option"><span>{opening.kind} · {room?.name ?? "Unknown room"} · {opening.wall}</span><small>{opening.offsetM} m offset · {opening.widthM} m wide</small></div>;
            })}</div>}
          </section>
          <div className="design-actions"><button type="button" className="design-save" onClick={savePlan} disabled={!loaded}><Save size={15}/> Save plan</button><button type="button" className="design-export" onClick={exportPlan}><Download size={15}/> Export</button><button type="button" className="design-export" onClick={() => window.print()}><Printer size={15}/> Print</button><button type="button" className="design-export" onClick={resetPlan}><RotateCcw size={15}/> Reset</button><label className="design-export design-import-label"><FileUp size={14}/> Import<input type="file" accept="application/json,.json" onChange={importPlan}/></label></div>
          <p className="design-storage-note">Versioned design saved in this browser only. Older plans remain available as a legacy backup; export JSON before clearing browser data.</p>
        </aside>
      </div>
      <footer className="design-footer"><Link href="/studio">← Back to Land Studio</Link><span>2D concept editor · Not construction-ready</span></footer>
    </main>
  );
}
