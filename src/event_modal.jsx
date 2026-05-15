// ===== Event Edit Modal =====
import { useState, useEffect } from 'react'
import { CATEGORIES, CAT_BY_ID } from './data.js'

const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 7; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hh = ((h + 11) % 12) + 1;
      const ap = h >= 12 ? "PM" : "AM";
      out.push({ value: v, label: `${hh}:${String(m).padStart(2, "0")} ${ap}` });
    }
  }
  return out;
})();

export default function EventModal({ open, event, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState("sight");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (!open || !event) return;
    setTitle(event.title || "");
    setNote(event.note || "");
    setCat(event.category || "sight");
    setStart(event.start || "10:00");
    setEnd(event.end || "11:00");
    setCost(event.cost > 0 ? String(event.cost) : "");
  }, [open, event]);

  if (!open || !event) return null;

  const onStartChange = (v) => {
    setStart(v);
    if (toMin(v) >= toMin(end)) setEnd(fromMin(toMin(v) + 60));
  };
  const onEndChange = (v) => {
    if (toMin(v) <= toMin(start)) return;
    setEnd(v);
  };

  const valid = title.trim() && toMin(end) > toMin(start);
  const submit = () => {
    if (!valid) return;
    onSave({
      ...event,
      title: title.trim(),
      note: note.trim(),
      category: cat,
      start, end,
      cost: parseFloat(cost) || 0,
    });
  };

  const d = new Date(event.day + "T00:00:00");
  const dateLabel = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Edit activity</h2>
        <p className="modal-sub">{dateLabel} · added by {event.addedBy}</p>

        <div className="field">
          <label>Title</label>
          <input type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus />
        </div>

        <div className="field-row">
          <div className="field" style={{ flex: 1 }}>
            <label>Starts</label>
            <select className="time-select" value={start} onChange={e => onStartChange(e.target.value)}>
              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Ends</label>
            <select className="time-select" value={end} onChange={e => onEndChange(e.target.value)}>
              {TIME_OPTIONS.filter(t => toMin(t.value) > toMin(start)).map(t =>
                <option key={t.value} value={t.value}>{t.label}</option>
              )}
            </select>
          </div>
          <div className="field" style={{ width: 140, flexShrink: 0 }}>
            <label>Cost ($)</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0 = free"
              value={cost}
              onChange={e => setCost(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Category</label>
          <div className="tag-picker">
            {CATEGORIES.map(c => (
              <button key={c.id}
                className={"tag-pick" + (cat === c.id ? " active" : "")}
                style={{ background: c.bg, color: c.ink }}
                onClick={() => setCat(c.id)}>
                <span style={{ marginRight: 6 }}>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Note / description</label>
          <textarea
            placeholder="Notes for the day…"
            value={note}
            onChange={e => setNote(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn-danger" onClick={() => onDelete(event.id)}>Remove from itinerary</button>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!valid}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
