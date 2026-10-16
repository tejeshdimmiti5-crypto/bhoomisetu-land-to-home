"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Plus, Trash2, Wallet } from "lucide-react";
import { calculateEstimate, type EstimateInput, type EstimateLineItem } from "../../lib/estimate";

const STORAGE_KEY = "bhoomisetu-estimate-v1";
type DraftItem = EstimateLineItem;

function today() {
  return new Date().toISOString().slice(0, 10);
}
function newItem(index: number): DraftItem {
  return {
    id: `item-${Date.now()}-${index}`,
    description: "",
    quantity: 1,
    unit: "unit",
    unitRateINR: 0,
    rateOrigin: "user_quote",
    sourceLabel: "",
    sourceDate: today(),
    region: "",
    wastagePercent: 0,
  };
}
function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export default function EstimatePage() {
  const [title, setTitle] = useState("My home budget");
  const [region, setRegion] = useState("Gudivada, Andhra Pradesh");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [exclusionsText, setExclusionsText] = useState("Land purchase\nArchitect and engineering fees\nApprovals, taxes and utility connections");
  const [notice, setNotice] = useState("Start with rates from your own supplier quotes or dated sources. No market prices are pre-filled.");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EstimateInput>;
        if (parsed.schemaVersion === 1 && Array.isArray(parsed.items) && parsed.items.length <= 500) {
          const checked = calculateEstimate(parsed);
          if (checked.valid) {
            setTitle(parsed.title ?? "My home budget");
            setRegion(parsed.region ?? "");
            setItems(parsed.items);
            if (Array.isArray(parsed.exclusions)) setExclusionsText(parsed.exclusions.join("\n"));
            setNotice("Restored your saved estimate from this browser.");
          } else {
            setNotice("Saved estimate could not be restored safely. Start a new estimate or import a valid backup.");
          }
        }
      }
    } catch {
      setNotice("Saved estimate could not be read. You can start a new estimate and export a backup.");
    }
    setLoaded(true);
  }, []);

  const input = useMemo<EstimateInput>(() => ({
    schemaVersion: 1,
    title: title.trim() || "Untitled estimate",
    region: region.trim() || "Region not provided",
    currency: "INR",
    items,
    exclusions: exclusionsText.split("\n").map((line) => line.trim()).filter(Boolean),
    preparedAt: new Date().toISOString(),
  }), [title, region, items, exclusionsText]);
  const result = useMemo(() => calculateEstimate(input), [input]);
  const hasItems = items.length > 0;

  function updateItem(id: string, field: keyof DraftItem, value: string) {
    setItems((current) => current.map((item) => item.id !== id ? item : ({
      ...item,
      [field]: field === "quantity" || field === "unitRateINR" || field === "wastagePercent" ? (value.trim() === "" ? 0 : Number(value)) : value,
    } as DraftItem)));
  }
  function addItem() {
    if (items.length >= 500) { setNotice("This estimate supports up to 500 line items."); return; }
    setItems((current) => [...current, newItem(current.length)]);
  }
  function save() {
    if (!hasItems) { setNotice("Add at least one line item before saving a cost estimate."); return; }
    if (!result.valid) { setNotice(result.errors[0] ?? "Fix the estimate fields before saving."); return; }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
      setNotice("Estimate saved in this browser. Export JSON as a separate backup.");
    } catch {
      setNotice("Browser storage is unavailable or full. Export JSON to keep a backup.");
    }
  }
  function exportJson() {
    if (!hasItems || !result.valid) { setNotice("Add at least one valid line item before exporting."); return; }
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bhoomisetu-estimate.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Estimate JSON exported. Keep it with the dated quotes and receipts.");
  }
  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) { setNotice("Estimate backup must be 1 MB or smaller."); return; }
    try {
      const parsed = JSON.parse(await file.text());
      const checked = calculateEstimate(parsed);
      if (!checked.valid) { setNotice(`Import rejected: ${checked.errors[0] ?? "invalid estimate"}`); return; }
      setTitle(parsed.title);
      setRegion(parsed.region);
      setItems(parsed.items);
      setExclusionsText(parsed.exclusions.join("\n"));
      setNotice("Estimate imported into the editor. Save it to persist in this browser.");
    } catch {
      setNotice("Could not import this file. Check that it is valid estimate JSON.");
    }
  }

  return (
    <main className="estimate-page">
      <header className="estimate-header">
        <Link href="/" className="estimate-back"><ArrowLeft size={16} /> Workspace</Link>
        <div><span className="estimate-eyebrow">BHOOMISETU · COST PLANNING</span><h1>Build an explainable budget</h1><p>Use your own quantities and dated supplier rates. Every total can be traced back to its input.</p></div>
        <span className="estimate-local-badge">Local-first prototype</span>
      </header>
      <div className="estimate-notice" role="status">{notice}</div>
      <section className="estimate-card estimate-intro">
        <div className="estimate-intro-icon"><Wallet size={22} /></div>
        <div><h2>No guessed market prices</h2><p>BhoomiSetu calculates arithmetic only. Choose whether a rate comes from a supplier quote or a public source you checked yourself. The app does not fetch live rates or independently verify sources or suppliers.</p></div>
      </section>
      <section className="estimate-card">
        <div className="estimate-section-head"><div><span className="estimate-kicker">01 · ESTIMATE DETAILS</span><h2>What are we planning?</h2></div></div>
        <div className="estimate-form-grid">
          <label>Estimate name<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ground floor home" /></label>
          <label>Project region<input value={region} maxLength={200} onChange={(e) => setRegion(e.target.value)} placeholder="Town, district, state" /></label>
        </div>
      </section>
      <section className="estimate-card">
        <div className="estimate-section-head"><div><span className="estimate-kicker">02 · COST INPUTS</span><h2>Line items</h2><p>Add only quantities and rates you can explain.</p></div><button className="estimate-add" onClick={addItem} disabled={items.length >= 500}><Plus size={15} /> Add item</button></div>
        {items.length === 0 ? <div className="estimate-empty"><strong>Your estimate is empty</strong><p>No cost total is shown until you enter at least one item. Start with a dated quote for a material or service.</p><button className="estimate-add" onClick={addItem}><Plus size={15} /> Add first item</button></div> : <div className="estimate-items">
          {items.map((item, index) => <article className="estimate-item" key={item.id}>
            <div className="estimate-item-head"><strong>Item {index + 1}</strong><button className="estimate-delete" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Remove item ${index + 1}`}><Trash2 size={15} /> Remove</button></div>
            <div className="estimate-form-grid">
              <label>Material / service<input value={item.description} maxLength={200} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="e.g. Cement" /></label>
              <label>Unit<input value={item.unit} maxLength={40} onChange={(e) => updateItem(item.id, "unit", e.target.value)} placeholder="bag, kg, m², day" /></label>
              <label>Quantity<input type="number" min="0.0001" step="any" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} /></label>
              <label>Rate per unit (₹)<input type="number" min="0" step="any" value={item.unitRateINR} onChange={(e) => updateItem(item.id, "unitRateINR", e.target.value)} /></label>
              <label>Rate basis<select value={item.rateOrigin} onChange={(e) => updateItem(item.id, "rateOrigin", e.target.value)}><option value="user_quote">Supplier / contractor quote</option><option value="verified_source">Public source I checked myself</option></select></label>
              <label>Source / supplier quote<input value={item.sourceLabel} maxLength={200} onChange={(e) => updateItem(item.id, "sourceLabel", e.target.value)} placeholder="Supplier, quote ID or URL/title" /></label>
              <label>Rate date<input type="date" value={item.sourceDate} onChange={(e) => updateItem(item.id, "sourceDate", e.target.value)} /></label>
              <label>Rate applies to region<input value={item.region} maxLength={200} onChange={(e) => updateItem(item.id, "region", e.target.value)} placeholder="Where the quote applies" /></label>
              <label>Wastage allowance (%)<input type="number" min="0" max="100" step="0.5" value={item.wastagePercent} onChange={(e) => updateItem(item.id, "wastagePercent", e.target.value)} /></label>
            </div>
            <div className="estimate-line-total"><span>Calculated line total (before any taxes/transport not included)</span><strong>{Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitRateINR) && item.unitRateINR >= 0 && Number.isFinite(item.wastagePercent) && item.wastagePercent >= 0 && item.wastagePercent <= 100 ? formatINR(item.quantity * item.unitRateINR * (1 + item.wastagePercent / 100)) : "—"}</strong></div>
          </article>)}
        </div>}
      </section>
      <section className="estimate-card">
        <div className="estimate-section-head"><div><span className="estimate-kicker">03 · SCOPE BOUNDARIES</span><h2>What is not included?</h2><p>Keep exclusions visible so a partial estimate is not mistaken for the full cost of building.</p></div></div>
        <label className="estimate-full-label">One exclusion per line<textarea value={exclusionsText} rows={4} onChange={(e) => setExclusionsText(e.target.value)} /></label>
      </section>
      <section className="estimate-card estimate-total-card">
        <div><span className="estimate-kicker">ESTIMATE SUMMARY</span><h2>{title || "Untitled estimate"}</h2><p>{region || "Region not provided"} · {items.length} line item{items.length === 1 ? "" : "s"}</p></div>
        {hasItems && result.valid ? <div className="estimate-totals"><div><span>Base subtotal</span><strong>{formatINR(result.subtotalINR)}</strong></div><div><span>Wastage allowance</span><strong>{formatINR(result.totalWastageINR)}</strong></div><div className="estimate-grand-total"><span>Entered-scope total</span><strong>{formatINR(result.totalINR)}</strong></div></div> : <p className="estimate-warning">{hasItems ? (result.errors[0] ?? "Complete all required source and quantity fields to calculate the total.") : "No total available yet — add a line item first."}</p>}
        <p className="estimate-disclaimer">Planning aid only, not a contractor quotation, quantity survey, engineering review, or price guarantee. Results cover only entered items and exclude the items listed above. Rates, taxes, transport, labour scope, quantities and local applicability need independent review. “Source” is user-entered and is not independently verified by this prototype.</p>
        <div className="estimate-actions"><button onClick={save} disabled={!loaded}>Save locally</button><button className="estimate-secondary" onClick={exportJson}>Export JSON</button><label className="estimate-secondary estimate-file-label"><Download size={14} /> Import JSON<input type="file" accept="application/json,.json" onChange={importJson} /></label></div>
      </section>
      <footer className="estimate-footer"><Link href="/design">← Back to house design</Link><Link href="/studio">Open Land Studio →</Link><span>INR · user-entered rates · browser-local</span></footer>
    </main>
  );
}
