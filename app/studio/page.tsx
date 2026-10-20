"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileUp, Plus, Save, Trash2, X } from "lucide-react";
import { measurePolygon, type Point2D } from "../../lib/geometry";
import { projectGpsToLocal } from "../../lib/gps-projection";
import { deletePlot, exportPlots, importPlots, listPlots, requestPersistentStorage, savePlot, type SavedPlot } from "../../lib/plot-store";

const starterRing: Point2D[] = [[0, 0], [20, 0], [20, 15], [0, 15]];

function formatArea(area: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(area);
}

export default function LandStudioPage() {
  const [name, setName] = useState("My first plot");
  const [ring, setRing] = useState<Point2D[]>(starterRing);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [plots, setPlots] = useState<SavedPlot[]>([]);
  const [notice, setNotice] = useState("Draw or edit the boundary, then save a backup.");
  const [error, setError] = useState("");
  const [storageStatus, setStorageStatus] = useState("Checking browser storage…");
  const [busy, setBusy] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Point2D[]>([]);
  const [captureMethod, setCaptureMethod] = useState<"manual" | "gps">("manual");
  const [gpsOrigin, setGpsOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsCandidate, setGpsCandidate] = useState<{ point: Point2D; origin: { latitude: number; longitude: number }; accuracy: number; first: boolean } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  const measurements = useMemo(() => {
    try { return { value: measurePolygon(ring), error: "" }; }
    catch (cause) { return { value: null, error: cause instanceof Error ? cause.message : "Boundary is invalid." }; }
  }, [ring]);

  const refreshPlots = useCallback(async () => {
    try { setPlots(await listPlots()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load saved plots."); }
  }, []);

  useEffect(() => {
    const requestedName = new URLSearchParams(window.location.search).get("name");
    if (requestedName?.trim()) setName(requestedName.trim().slice(0, 100));
  }, []);

  useEffect(() => {
    void refreshPlots();
    void requestPersistentStorage().then((status) => {
      setStorageStatus(status === "granted" ? "Persistent storage granted" : status === "denied" ? "Browser may clear local data — export backups" : "Persistent storage request unsupported");
    }).catch(() => setStorageStatus("Browser may clear local data — export backups"));
  }, [refreshPlots]);

  function updatePoint(index: number, axis: 0 | 1, raw: string) {
    const value = raw.trim() === "" ? 0 : Number(raw);
    setRing((current) => current.map((point, i) => {
      if (i !== index) return point;
      const next: [number, number] = [point[0], point[1]];
      next[axis] = value;
      return next;
    }));
  }

  function startDrawing() {
    setDrawPoints([]);
    setDrawMode(true);
    setError("");
    setNotice("Tap or click the canvas to place boundary corners. Place at least three points, then finish.");
  }

  function addDrawPoint(event: React.MouseEvent<SVGSVGElement>) {
    if (!drawMode) return;
    if (drawPoints.length >= 200) { setError("A plot can have at most 200 vertices in this drawing tool."); return; }
    const bounds = event.currentTarget.getBoundingClientRect();
    const xPx = (event.clientX - bounds.left) / bounds.width * 320;
    const yPx = (event.clientY - bounds.top) / bounds.height * 220;
    if (xPx < 30 || xPx > 290 || yPx < 30 || yPx > 190) return;
    const point: Point2D = [Number(((xPx - 30) / 8).toFixed(3)), Number(((190 - yPx) / 8).toFixed(3))];
    setDrawPoints((current) => [...current, point]);
  }

  function finishDrawing() {
    if (drawPoints.length < 3) { setError("Place at least three boundary points before finishing."); return; }
    setRing(drawPoints.map((point) => [point[0], point[1]] as Point2D));
    setActiveId(undefined);
    setDrawMode(false);
    setDrawPoints([]);
    setError("");
    setNotice("Boundary drawn. Review the measurements and save your plot.");
  }

  function captureGpsCorner() {
    if (!navigator.geolocation) { setError("This browser does not support GPS location. Use manual drawing instead."); return; }
    if (gpsCandidate) { setError("Review or discard the pending GPS point before capturing another."); return; }
    if (gpsOrigin && ring.length >= 200) { setError("A plot can have at most 200 vertices."); return; }
    setGpsBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const origin = gpsOrigin ?? { latitude, longitude };
      if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 50) {
        setError("GPS accuracy is too poor or unavailable (over 50 m). Move to a clearer outdoor location or use manual drawing.");
        setGpsBusy(false);
        return;
      }
      let point: Point2D;
      try {
        point = gpsOrigin ? projectGpsToLocal(origin, latitude, longitude) : [0, 0];
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "GPS coordinates were invalid.");
        setGpsBusy(false);
        return;
      }
      // Keep the existing boundary untouched until the user reviews and confirms this point.
      setGpsCandidate({ point, origin, accuracy, first: !gpsOrigin });
      setNotice(accuracy > 10
        ? `GPS fix received with ±${Math.round(accuracy)} m accuracy. Review carefully; this is too imprecise for reliable surveying.`
        : `GPS fix received with ±${Math.round(accuracy)} m reported accuracy. Review the point before adding it.`);
      setGpsBusy(false);
    }, (cause) => {
      setError(cause.code === 1 ? "Location permission was denied. Enable it in your browser or use manual drawing." : cause.code === 2 ? "GPS position is unavailable. Move outdoors and try again." : "GPS timed out. Try again or use manual drawing.");
      setGpsBusy(false);
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }

  function confirmGpsCorner() {
    if (!gpsCandidate) return;
    const candidate = gpsCandidate;
    if (candidate.first) {
      setRing([candidate.point]);
      setGpsOrigin(candidate.origin);
    } else {
      setRing((current) => [...current, candidate.point]);
    }
    setGpsAccuracy(candidate.accuracy);
    setCaptureMethod("gps");
    setDrawMode(false);
    setActiveId(undefined);
    setGpsCandidate(null);
    setError("");
    setNotice(candidate.accuracy > 10
      ? `GPS corner added with ±${Math.round(candidate.accuracy)} m accuracy warning. Check and manually correct the coordinates.`
      : `GPS corner added (±${Math.round(candidate.accuracy)} m reported accuracy). Check the coordinates before saving.`);
  }

  function addVertex() {
    if (ring.length >= 200) { setError("A plot can have at most 200 vertices."); return; }
    const last = ring[ring.length - 1] ?? [0, 0];
    setRing((current) => [...current, [last[0] + 5, last[1] + 5]]);
  }

  function startNew() {
    setActiveId(undefined);
    setName("New plot");
    setRing(starterRing.map((point) => [...point] as Point2D));
    setDrawMode(false);
    setDrawPoints([]);
    setCaptureMethod("manual");
    setGpsOrigin(null);
    setGpsAccuracy(null);
    setGpsCandidate(null);
    setError("");
    setNotice("New unsaved plot. Give it a name and save when ready.");
  }

  function loadPlot(plot: SavedPlot) {
    setActiveId(plot.id);
    setName(plot.name);
    setRing(plot.ring.map((point) => [...point] as Point2D));
    setDrawMode(false);
    setDrawPoints([]);
    setCaptureMethod(plot.measurementMethod);
    setGpsOrigin(plot.origin);
    setGpsAccuracy(null);
    setGpsCandidate(null);
    setError("");
    setNotice(`Loaded “${plot.name}” · version ${plot.recordVersion}`);
  }

  async function handleSave() {
    setError("");
    setBusy(true);
    try {
      const result = await savePlot({ id: activeId, name, ring, origin: gpsOrigin, measurementMethod: captureMethod });
      setActiveId(result.plot.id);
      setName(result.plot.name);
      setRing(result.plot.ring);
      await refreshPlots();
      setNotice(`Saved “${result.plot.name}” · record version ${result.plot.recordVersion}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plot could not be saved.");
    } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!activeId) { startNew(); return; }
    setBusy(true);
    try {
      await deletePlot(activeId);
      await refreshPlots();
      startNew();
      setNotice("Plot deleted from this browser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plot could not be deleted.");
    } finally { setBusy(false); }
  }

  async function handleExport() {
    setError("");
    try {
      const content = await exportPlots();
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bhoomisetu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Backup exported. Keep a copy somewhere safe.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Export failed."); }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Backup must be 5 MB or smaller."); return; }
    setError("");
    setBusy(true);
    try {
      const result = await importPlots(await file.text());
      await refreshPlots();
      const conflictNote = result.conflicts.length
        ? ` ${result.conflicts.length} conflicting existing record(s) were left unchanged.`
        : "";
      setNotice(`Imported ${result.imported} new plot(s); ${result.unchanged} already matched.${conflictNote}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed."); }
    finally { setBusy(false); }
  }

  return (
    <main className="studio-page">
      <header className="studio-header">
        <Link href="/" className="studio-back"><ArrowLeft size={17} /> Dashboard</Link>
        <div><span className="studio-eyebrow">BHOOMISETU · LAND STUDIO</span><h1>Measure your land</h1><p>Enter boundary points in metres. Measurements are calculated from rounded, validated coordinates.</p></div>
        <div className="studio-storage">{storageStatus}</div>
      </header>
      <div className="studio-notice" role="status">{notice}</div>
      {error && <div className="studio-error" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16}/></button></div>}
      <div className="studio-layout">
        <section className="studio-card studio-editor">
          <div className="studio-card-heading"><div><span className="studio-step">STEP 01</span><h2>Plot boundary</h2></div><button className="studio-quiet-button" onClick={startNew}>New plot</button></div>
          <label className="studio-field-label" htmlFor="plot-name">Plot name</label>
          <input className="studio-text-input" id="plot-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Family land in Gudivada"/>
          <div className="studio-draw-tools"><button className="studio-secondary-button" type="button" onClick={startDrawing}>Draw on canvas</button><button className="studio-secondary-button" type="button" disabled={gpsBusy || !!gpsCandidate} onClick={captureGpsCorner}>{gpsBusy ? "Getting GPS…" : "Capture GPS fix"}</button>{gpsCandidate && <><span role="status">Pending point: ({gpsCandidate.point[0].toFixed(3)}, {gpsCandidate.point[1].toFixed(3)}) m · ±{Math.round(gpsCandidate.accuracy)} m</span><button className="studio-primary-button" type="button" onClick={confirmGpsCorner}>Confirm and add corner</button><button className="studio-secondary-button" type="button" onClick={() => setGpsCandidate(null)}>Discard GPS fix</button></>}{drawMode && <><span>{drawPoints.length} points placed</span><button className="studio-primary-button" type="button" onClick={finishDrawing}>Finish boundary</button><button className="studio-secondary-button" type="button" onClick={() => { setDrawMode(false); setDrawPoints([]); }}>Cancel drawing</button></>}</div>
          <div className="studio-table-head"><span>VERTEX</span><span>X · EAST/WEST (m)</span><span>Y · NORTH/SOUTH (m)</span><span></span></div>
          <div className="studio-vertices">
            {ring.map((point, index) => <div className="studio-vertex-row" key={index}>
              <span className="studio-vertex-index">{String(index + 1).padStart(2, "0")}</span>
              <input aria-label={`Vertex ${index + 1} X in metres`} type="number" step="0.001" value={Number.isFinite(point[0]) ? point[0] : ""} onChange={(event) => updatePoint(index, 0, event.target.value)} />
              <input aria-label={`Vertex ${index + 1} Y in metres`} type="number" step="0.001" value={Number.isFinite(point[1]) ? point[1] : ""} onChange={(event) => updatePoint(index, 1, event.target.value)} />
              <button className="studio-icon-button" disabled={ring.length <= 3} onClick={() => setRing((current) => current.filter((_, i) => i !== index))} aria-label={`Remove vertex ${index + 1}`}><Trash2 size={15}/></button>
            </div>)}
          </div>
          <button className="studio-add-vertex" onClick={addVertex}><Plus size={15}/> Add vertex</button>
          <div className="studio-editor-foot"><span>{ring.length} vertices · open ring</span><span>Units: metres · {captureMethod === "gps" ? "GPS-assisted" : "manual"}</span></div>{captureMethod === "gps" && <div className="studio-gps-note" role="note"><strong>GPS capture</strong><span>{gpsAccuracy === null ? "Waiting for first location fix." : `Latest reported accuracy: ±${Math.round(gpsAccuracy)} m.`} GPS readings can drift significantly; revisit points, compare against a proper survey, and do not treat this as a legal boundary.</span><button type="button" onClick={() => { setCaptureMethod("manual"); setGpsOrigin(null); setGpsAccuracy(null); setGpsCandidate(null); setNotice("Switched to manual mode. Existing vertex coordinates remain in the editor."); }}>Switch to manual</button></div>}
          <div className="studio-actions"><button className="studio-primary-button" disabled={busy || !measurements.value} onClick={handleSave}><Save size={16}/>{busy ? "Saving…" : activeId ? "Save changes" : "Save plot"}</button><button className="studio-secondary-button" onClick={handleExport}><Download size={16}/> Export backup</button><label className="studio-secondary-button studio-import-button"><FileUp size={16}/> Import backup<input type="file" accept="application/json,.json" onChange={handleImport} disabled={busy}/></label>{activeId && <button className="studio-delete-button" disabled={busy} onClick={handleDelete}>Delete</button>}</div>
          <p className="studio-footnote">Saved to this browser using IndexedDB. Local browser storage is not cloud backup; export JSON regularly.</p>
        </section>
        <section className="studio-side-column">
          <article className="studio-card studio-measurements">
            <span className="studio-step">LIVE MEASUREMENTS</span><h2>Your plot at a glance</h2>
            {measurements.value ? <>
              <div className={`studio-plot-preview ${drawMode ? "studio-draw-active" : ""}`}>
                {drawMode && <p className="studio-draw-hint">Click/tap inside the canvas to place corners. Canvas coordinates use a local metre grid.</p>}
                <svg viewBox="0 0 320 220" role="img" aria-label={drawMode ? "Click to place plot boundary points" : "Scaled preview of plot boundary"} onClick={addDrawPoint} style={{cursor:drawMode ? "crosshair" : "default",touchAction:drawMode ? "manipulation" : "auto"}}>
                  <defs><pattern id="studio-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="#e6ece2" strokeWidth="1"/></pattern></defs>
                  <rect width="320" height="220" fill="url(#studio-grid)" rx="8"/>
                  
                  <polygon points={measurements.value.ring.map(([x,y]) => {
                    const xs=measurements.value!.ring.map(p=>p[0]), ys=measurements.value!.ring.map(p=>p[1]);
                    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
                    const scale=Math.min(260/Math.max(maxX-minX,0.001),160/Math.max(maxY-minY,0.001));
                    return `${30+(x-minX)*scale},${190-(y-minY)*scale}`;
                  }).join(" ")} fill="#dcebd8" stroke="#4c7957" strokeWidth="2.5" strokeLinejoin="round"/>
                  {measurements.value.ring.map(([x,y],i) => {
                    const xs=measurements.value!.ring.map(p=>p[0]), ys=measurements.value!.ring.map(p=>p[1]);
                    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
                    const scale=Math.min(260/Math.max(maxX-minX,0.001),160/Math.max(maxY-minY,0.001));
                    return <g key={i}><circle cx={30+(x-minX)*scale} cy={190-(y-minY)*scale} r="4" fill="#315d48" stroke="white" strokeWidth="1.5"/><text x={30+(x-minX)*scale+6} y={190-(y-minY)*scale-7} fontSize="9" fill="#355a3d">{i+1}</text></g>;
                  })}
                {drawMode && <>{drawPoints.length > 1 && <polyline points={drawPoints.map(([x,y])=>`${30+x*8},${190-y*8}`).join(" ")} fill="none" stroke="#315d48" strokeWidth="2.5" strokeDasharray="5 3" strokeLinejoin="round" />}{drawPoints.map(([x,y],i)=><g key={`draft-${i}`}><circle cx={30+x*8} cy={190-y*8} r="5" fill="#315d48" stroke="white" strokeWidth="2"/><text x={36+x*8} y={184-y*8} fontSize="10" fill="#315d48">{i+1}</text></g>)}</>}
                </svg>
              </div>
              <div className="studio-metric"><span>Area</span><strong>{formatArea(measurements.value.areaM2)} m²</strong></div>
              <div className="studio-metric"><span>Area (square feet)</span><strong>{formatArea(measurements.value.areaM2 * 10.7639104167)} ft²</strong></div>
              <div className="studio-metric"><span>Perimeter</span><strong>{formatArea(measurements.value.perimeterM)} m</strong></div>
              <div className="studio-metric"><span>Boundary points</span><strong>{measurements.value.vertexCount}</strong></div>
              <p className="studio-measure-note">{captureMethod === "gps" ? "GPS-assisted local planar estimate. Accuracy varies with device, sky visibility and environment; not a legal survey." : "Planar estimate only. Legal boundaries and local survey rules are not assessed by this editor."}</p>
            </> : <div className="studio-validation-error"><strong>Boundary needs attention</strong><p>{measurements.error}</p><small>Check for crossing edges, repeated points, very narrow slivers or a closed ring.</small></div>}
          </article>
          <article className="studio-card studio-saved-plots"><div className="studio-card-heading"><div><span className="studio-step">LOCAL LIBRARY</span><h2>Saved plots</h2></div><span className="studio-count">{plots.length}</span></div>
            {plots.length ? <div className="studio-saved-list">{plots.map((plot) => <div className={plot.id === activeId ? "studio-saved-item selected" : "studio-saved-item"} key={plot.id}><button onClick={() => loadPlot(plot)}><strong>{plot.name}</strong><span>{formatArea(plot.areaM2)} m² · v{plot.recordVersion}</span></button><button className="studio-icon-button" aria-label={`Delete ${plot.name}`} onClick={async () => { if (activeId === plot.id) setActiveId(undefined); try { await deletePlot(plot.id); await refreshPlots(); setNotice(`Deleted “${plot.name}”.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Delete failed."); } }}><Trash2 size={14}/></button></div>)}</div> : <p className="studio-empty-state">Your saved plots will appear here after the first save.</p>}
          </article>
        </section>
      </div>
      <footer className="studio-footer"><Link href="/">← Back to workspace</Link><span>Prototype · local planar metres · not a legal survey</span></footer>
    </main>
  );
}
