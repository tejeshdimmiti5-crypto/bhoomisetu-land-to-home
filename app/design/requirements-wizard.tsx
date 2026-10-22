"use client";

import { useState } from "react";
import { ArrowRight, House, Sparkles } from "lucide-react";

export type RequirementRoom = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
};

type Props = {
  onGenerate: (rooms: RequirementRoom[], style: string) => void;
  onCancel: () => void;
};

const roomTypes = [
  { key: "bedrooms", label: "Bedrooms", hint: "Includes a master bedroom", name: "Bedroom", width: 3.5, depth: 3.5, max: 8 },
  { key: "bathrooms", label: "Bathrooms / toilets", hint: "Choose the total number", name: "Bathroom", width: 1.8, depth: 2.2, max: 6 },
  { key: "kitchens", label: "Kitchens", hint: "Main kitchen or secondary kitchen", name: "Kitchen", width: 3, depth: 3, max: 3 },
  { key: "living", label: "Living rooms", hint: "Family or guest sitting space", name: "Living Room", width: 4.5, depth: 4, max: 3 },
  { key: "dining", label: "Dining rooms", hint: "Can be combined with living space later", name: "Dining Room", width: 3, depth: 3, max: 2 },
  { key: "pooja", label: "Pooja rooms", hint: "Optional prayer space", name: "Pooja Room", width: 1.8, depth: 2, max: 2 },
  { key: "study", label: "Study / home office", hint: "Optional work or study room", name: "Study Room", width: 2.5, depth: 3, max: 3 },
  { key: "utility", label: "Utility / laundry", hint: "Optional washing or storage area", name: "Utility Room", width: 2, depth: 2.5, max: 3 },
  { key: "store", label: "Store rooms", hint: "Optional household storage", name: "Store Room", width: 1.8, depth: 2, max: 4 },
  { key: "parking", label: "Car parking spaces", hint: "Concept placeholder; vehicle clearances need review", name: "Parking", width: 2.7, depth: 5, max: 3 },
] as const;

export default function HouseRequirementsWizard({ onGenerate, onCancel }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({
    bedrooms: 2, bathrooms: 2, kitchens: 1, living: 1, dining: 1,
    pooja: 0, study: 0, utility: 0, store: 0, parking: 1,
  });
  const [style, setStyle] = useState("Modern");
  const [special, setSpecial] = useState("");
  const roomTotal = roomTypes.reduce((sum, item) => sum + counts[item.key], 0);

  function submit() {
    const rooms: RequirementRoom[] = [];
    for (const item of roomTypes) {
      for (let i = 0; i < counts[item.key]; i++) {
        const name = item.name === "Bedroom" && i === 0
          ? "Master Bedroom"
          : counts[item.key] > 1 ? `${item.name} ${i + 1}` : item.name;
        rooms.push({
          id: `req-${item.key}-${i + 1}-${Date.now()}`,
          name,
          x: 0,
          y: 0,
          width: item.width,
          depth: item.depth,
        });
      }
    }
    if (special.trim()) {
      // Keep the preference visible in the confirmation notice; do not silently invent geometry.
      onGenerate(rooms, `${style} · Special requests: ${special.trim()}`);
    } else {
      onGenerate(rooms, style);
    }
  }

  return (
    <section className="requirements-wizard" aria-labelledby="requirements-title">
      <div className="requirements-heading">
        <div className="requirements-icon"><House size={21}/></div>
        <div>
          <span className="design-kicker">PERSONALISE YOUR HOME</span>
          <h2 id="requirements-title">Start with your family's needs</h2>
          <p>Choose room types and quantities. We'll create room requirements and prepare layout options for the selected plot or entered rectangular dimensions.</p>
        </div>
      </div>
      <div className="requirements-grid">
        {roomTypes.map((item) => (
          <label className="requirements-field" key={item.key}>
            <span className="requirements-field-title">{item.label}</span>
            <span className="requirements-field-hint">{item.hint}</span>
            <span className="requirements-stepper">
              <button type="button" aria-label={`Remove one ${item.label.toLowerCase()}`} disabled={counts[item.key] <= 0} onClick={() => setCounts(current => ({ ...current, [item.key]: Math.max(0, current[item.key] - 1) }))}>−</button>
              <strong>{counts[item.key]}</strong>
              <button type="button" aria-label={`Add one ${item.label.toLowerCase()}`} disabled={counts[item.key] >= item.max} onClick={() => setCounts(current => ({ ...current, [item.key]: Math.min(item.max, current[item.key] + 1) }))}>+</button>
            </span>
          </label>
        ))}
      </div>
      <div className="requirements-bottom-grid">
        <label className="design-label">Preferred style
          <select className="design-input" value={style} onChange={event => setStyle(event.target.value)}>
            <option>Modern</option>
            <option>Traditional</option>
            <option>Contemporary</option>
            <option>Simple and budget-friendly</option>
          </select>
        </label>
        <label className="design-label">Special requirements (optional)
          <textarea className="design-input requirements-textarea" value={special} maxLength={500} onChange={event => setSpecial(event.target.value)} placeholder="e.g. attached bathroom, east-facing entrance, elderly-friendly access…"/>
        </label>
      </div>
      <div className="requirements-footer">
        <div><strong>{roomTotal} spaces</strong><span>Default room sizes are starting estimates and can be edited later.</span></div>
        <div className="requirements-actions">
          <button type="button" className="design-export" onClick={onCancel}>Cancel</button>
          <button type="button" className="design-save" disabled={roomTotal === 0 || roomTotal > 40} onClick={submit}><Sparkles size={15}/> Generate layout options <ArrowRight size={15}/></button>
        </div>
      </div>
      <p className="requirements-disclaimer">Concept planning only. This first version generates a single-floor room layout; multi-floor planning, exact setbacks, structural design, ventilation and local-code compliance require separate review. A saved plot is not modified.</p>
    </section>
  );
}
