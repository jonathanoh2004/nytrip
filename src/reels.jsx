// ===== Activity Wall + Activity Modal (add + edit) =====
import { useState, useEffect } from 'react'
import { CAT_BY_ID, CATEGORIES, colorFor } from './data.js'
import { CategoryTag } from './components.jsx'

function fmtCost(n) {
  if (!n || n === 0) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

function ReelCard({ reel, onDelete, onEdit }) {
  const c = CAT_BY_ID[reel.category] || CAT_BY_ID.sight;
  const handleDragStart = (e) => {
    e.dataTransfer.setData("reel/id", reel.id);
    e.dataTransfer.setData("text/plain", reel.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const rot = ((reel.id.charCodeAt(reel.id.length - 1) || 0) % 5) - 2;
  const costLabel = fmtCost(reel.cost);
  return (
    <div
      className={"reel-card" + (reel.placedDay ? " placed" : "")}
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        if (e.target.closest(".actions")) return;
        onEdit(reel.id);
      }}
      style={{ transform: `rotate(${rot * 0.4}deg)` }}
    >
      <div className="actions" onClick={e => e.stopPropagation()}>
        <button className="icon-btn" title="Edit"
                onClick={(e) => { e.stopPropagation(); onEdit(reel.id); }}>✎</button>
        <button className="icon-btn" title="Open link"
                onClick={(e) => { e.stopPropagation(); window.open(reel.url, "_blank"); }}>↗</button>
        <button className="icon-btn" title="Remove"
                onClick={(e) => { e.stopPropagation(); onDelete(reel.id); }}>×</button>
      </div>
      <div className="reel-thumb" style={{ background: c.bg }}>
        <span className="pin" />
        {c.icon}
        <div className="play">▶</div>
      </div>
      <CategoryTag catId={reel.category} />
      <div className="reel-title">{reel.title}</div>
      {reel.note && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.3 }}>
          "{reel.note}"
        </div>
      )}
      <div className="reel-meta">
        <span className="author">
          <span className="author-dot" style={{ background: colorFor(reel.addedBy) }} />
          {reel.addedBy}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {costLabel && <span className="cost-badge">{costLabel}</span>}
          <span>{(() => { try { return new URL(reel.url).hostname.replace("www.",""); } catch { return ""; } })()}</span>
        </span>
      </div>
    </div>
  );
}

export function ReelModal({ open, reel, onClose, onSubmit, onDelete }) {
  const isEdit = !!reel;
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState("food");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (!open) return;
    if (reel) {
      setUrl(reel.url || "");
      setTitle(reel.title || "");
      setNote(reel.note || "");
      setCat(reel.category || "food");
      setCost(reel.cost > 0 ? String(reel.cost) : "");
    } else {
      setUrl(""); setTitle(""); setNote(""); setCat("food"); setCost("");
    }
  }, [open, reel]);

  if (!open) return null;

  const valid = url.trim() && title.trim();
  const submit = () => {
    if (!valid) return;
    onSubmit({
      url: url.trim(),
      title: title.trim(),
      note: note.trim(),
      category: cat,
      cost: parseFloat(cost) || 0,
    });
  };

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{isEdit ? "Edit activity" : "Add an activity"}</h2>
        <p className="modal-sub">
          {isEdit
            ? "Update the details, category, or cost estimate."
            : "Paste any link — Instagram, Google Maps, a restaurant site, anything."}
        </p>

        <div className="field">
          <label>Link</label>
          <input type="text"
            placeholder="https://instagram.com/reel/… or maps.google.com or any URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            autoFocus={!isEdit} />
        </div>

        <div className="field">
          <label>Title / what is it?</label>
          <input type="text"
            placeholder="e.g. $1 pizza slice on Bleecker St"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus={isEdit} />
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

        <div className="field" style={{ maxWidth: 200 }}>
          <label>Estimated cost ($)</label>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="0 = free"
            value={cost}
            onChange={e => setCost(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Note / description</label>
          <textarea
            placeholder="e.g. open midnight only, cash only, book ahead…"
            value={note}
            onChange={e => setNote(e.target.value)} />
        </div>

        <div className="modal-actions">
          {isEdit && (
            <button className="btn-danger" onClick={() => onDelete(reel.id)}>Delete activity</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!valid}>
            {isEdit ? "Save changes" : "Add to wall"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReelsBoard({ reels, onDelete, onEdit, openUpload }) {
  const [filter, setFilter] = useState("all");
  const [showPlaced, setShowPlaced] = useState(true);

  const filtered = reels.filter(r => {
    if (filter !== "all" && r.category !== filter) return false;
    if (!showPlaced && r.placedDay) return false;
    return true;
  });

  const byCat = CATEGORIES.map(c => ({ ...c, n: reels.filter(r => r.category === c.id).length }));
  const unplaced = reels.filter(r => !r.placedDay).length;
  const plannedCost = reels.filter(r => r.placedDay && r.cost > 0).reduce((s, r) => s + r.cost, 0);

  return (
    <div className="reels-body">
      <div className="reels-head">
        <div>
          <h2>Activity Wall</h2>
          <div className="sub" style={{ marginTop: 4 }}>
            {reels.length} activit{reels.length === 1 ? "y" : "ies"} · {unplaced} unscheduled ·
            {" "}{new Set(reels.map(r => r.addedBy)).size} planner{new Set(reels.map(r => r.addedBy)).size === 1 ? "" : "s"}
            {plannedCost > 0 && <> · <b style={{ color: "var(--c-art-deep)" }}>${Math.round(plannedCost).toLocaleString()} on calendar</b></>}
            <span style={{ marginLeft: 8, color: "var(--ink-faint)" }}>· click any card to edit</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="upload-btn" onClick={openUpload}>＋ Add activity</button>
      </div>

      <div className="filter-row">
        <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
          All <span style={{ opacity: 0.6 }}>{reels.length}</span>
        </button>
        {byCat.map(c => (
          <button key={c.id}
            className={"filter-chip" + (filter === c.id ? " active" : "")}
            onClick={() => setFilter(filter === c.id ? "all" : c.id)}>
            <span className="dot" style={{ background: c.bg }} />
            {c.label} <span style={{ opacity: 0.6 }}>{c.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)", fontWeight: 700 }}>
          <input type="checkbox" checked={showPlaced} onChange={e => setShowPlaced(e.target.checked)} />
          Show scheduled
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-board">
          <h3>Nothing pinned up yet ✿</h3>
          <p>Tap <b>＋ Add activity</b> at the top to drop in your first link.</p>
        </div>
      ) : (
        <div className="reels-grid">
          {filtered.map(r => (
            <ReelCard key={r.id} reel={r} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
