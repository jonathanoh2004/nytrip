// ===== Calendar Week View =====
import { useState } from 'react'
import {
  startOfWeek, addDays, sameDay, isoDay, fmtTime,
  MONTHS, MONTHS_SHORT, DOW,
  CAT_BY_ID, CATEGORIES,
} from './data.js'

function fmtCost(n) {
  if (!n || n === 0) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

// ---- Pie chart helpers ----
function polarXY(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function PieChart({ slices, size = 180 }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.42, hole = r * 0.46;
  let angle = 0;
  const paths = slices.filter(s => s.value > 0).map(s => {
    const pct = s.value / total;
    const start = angle;
    angle += pct * 360;
    const end = angle;
    if (pct >= 0.9999) return { ...s, pct, full: true };
    const s1 = polarXY(cx, cy, r, start);
    const e1 = polarXY(cx, cy, r, end);
    return {
      ...s, pct, full: false,
      d: `M ${cx} ${cy} L ${s1.x} ${s1.y} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${e1.x} ${e1.y} Z`,
    };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {paths.map((p, i) =>
        p.full
          ? <circle key={i} cx={cx} cy={cy} r={r} fill={p.bg} />
          : <path key={i} d={p.d} fill={p.bg} />
      )}
      <circle cx={cx} cy={cy} r={hole} fill="var(--paper)" />
    </svg>
  );
}

function CostChartModal({ open, onClose, events }) {
  if (!open) return null;
  const byCat = {};
  for (const ev of events) {
    if (ev.cost > 0) byCat[ev.category] = (byCat[ev.category] || 0) + ev.cost;
  }
  const slices = CATEGORIES.map(c => ({ ...c, value: byCat[c.id] || 0 })).filter(s => s.value > 0);
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Cost breakdown</h2>
        <p className="modal-sub">
          Estimated spend on scheduled activities · Total{" "}
          <b style={{ color: "var(--c-art-deep)" }}>${Math.round(total).toLocaleString()}</b>
        </p>
        {slices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-soft)", fontSize: 14 }}>
            No cost estimates yet.<br />Add them when editing activities or calendar events.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <PieChart slices={slices} size={180} />
            <div style={{ flex: 1, minWidth: 160 }}>
              {slices.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: s.bg, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{s.icon} {s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.deep }}>${Math.round(s.value).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", minWidth: 30, textAlign: "right" }}>
                    {Math.round(s.value / total * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ---- Mini calendar ----
function MiniCal({ anchor, tripStart, tripEnd, onJump, onEditTrip }) {
  const today = new Date();
  const m = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(m);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const monthLabel = `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  return (
    <div className="minical">
      <div className="minical-head">
        <h3>{monthLabel}</h3>
        <button className="edit-trip-btn" onClick={onEditTrip} title="Edit trip dates">✎ Trip dates</button>
      </div>
      <div className="minical-grid">
        {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="minical-dow">{d}</div>)}
        {days.map((d, i) => {
          const muted = d.getMonth() !== anchor.getMonth();
          const isToday = sameDay(d, today);
          const inTrip = d >= tripStart && d <= tripEnd;
          const cn = ["minical-day", muted?"muted":"", isToday?"today":"", inTrip?"in-trip":""].filter(Boolean).join(" ");
          return <div key={i} className={cn} onClick={() => onJump(d)}>{d.getDate()}</div>;
        })}
      </div>
    </div>
  );
}

function eventBox(ev) {
  const [sh, sm] = ev.start.split(":").map(Number);
  const [eh, em] = ev.end.split(":").map(Number);
  const dayStartMin = 7 * 60;
  const px = (m) => ((m - dayStartMin) / 60) * 56;
  return { top: px(sh*60+sm), height: Math.max(28, px(eh*60+em) - px(sh*60+sm)) };
}

function CalEvent({ ev, onEdit }) {
  const c = CAT_BY_ID[ev.category] || CAT_BY_ID.sight;
  const box = eventBox(ev);
  const costLabel = fmtCost(ev.cost);
  const handleDragStart = (e) => {
    e.dataTransfer.setData("event/id", ev.id);
    e.dataTransfer.setData("text/plain", ev.id);
    e.dataTransfer.effectAllowed = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    e.dataTransfer.setData("event/grabY", String(e.clientY - rect.top));
  };
  return (
    <div className="event"
      draggable
      onDragStart={handleDragStart}
      style={{ top: box.top, height: box.height, background: c.bg, borderLeftColor: c.deep }}
      onClick={(e) => { e.stopPropagation(); onEdit(ev.id); }}
      title="Click to edit — drag to move">
      <div className="ev-time">{fmtTime(ev.start)} – {fmtTime(ev.end)}</div>
      <div className="ev-title">{ev.title}</div>
      {costLabel && box.height >= 52 && <div className="ev-cost">{costLabel}</div>}
      <div className="ev-author">added by {ev.addedBy}</div>
    </div>
  );
}

function ReelBubble({ reel, index, onEdit, onReorderHover, onReorderDrop, isDragging, dropIndicator }) {
  const c = CAT_BY_ID[reel.category] || CAT_BY_ID.sight;
  const handleDragStart = (e) => {
    e.dataTransfer.setData("reel/id", reel.id);
    e.dataTransfer.setData("text/plain", reel.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const handleDragOver = (e) => {
    if (!e.dataTransfer.types.includes("reel/id") && !e.dataTransfer.types.includes("text/plain")) return;
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onReorderHover(index, (e.clientY - rect.top) < rect.height / 2);
  };
  const handleDrop = (e) => {
    if (!e.dataTransfer.types.includes("reel/id") && !e.dataTransfer.types.includes("text/plain")) return;
    e.preventDefault(); e.stopPropagation();
    const draggedId = e.dataTransfer.getData("reel/id") || e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onReorderDrop(draggedId, index, (e.clientY - rect.top) < rect.height / 2);
  };
  return (
    <>
      {dropIndicator === "before" && <div className="reel-drop-line" />}
      <div
        className={"reel-bubble" + (isDragging ? " dragging" : "")}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => onEdit && onEdit(reel.id)}
        style={{ background: c.bg, color: c.ink, borderColor: c.deep }}
        title={`${reel.title} — drag to reorder, drag onto day to schedule, click to edit`}
      >
        <span className="reel-bubble-icon">{c.icon}</span>
        <span className="reel-bubble-title">{reel.title}</span>
        <span className="reel-bubble-grip">⋮⋮</span>
      </div>
      {dropIndicator === "after" && <div className="reel-drop-line" />}
    </>
  );
}

export default function Calendar({ anchor, setAnchor, events, reels, tripStart, tripEnd, onDropReel, onMoveEvent, onReorderReels, onEditEvent, onEditReel, onEditTrip }) {
  const today = new Date();
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);
  const [dragOver, setDragOver] = useState(null);
  const [reelFilter, setReelFilter] = useState("all");
  const [reorderHint, setReorderHint] = useState(null);
  const [chartOpen, setChartOpen] = useState(false);

  const unplacedReels = (reels || []).filter(r => !r.placedDay);
  const visibleReels = reelFilter === "all" ? unplacedReels : unplacedReels.filter(r => r.category === reelFilter);

  // Cost calculations
  const totalCost = events.reduce((s, e) => s + (e.cost || 0), 0);
  const dayCosts = events.reduce((acc, e) => {
    if (e.cost > 0) acc[e.day] = (acc[e.day] || 0) + e.cost;
    return acc;
  }, {});

  const handleDragOver = (e, dayIso) => {
    const t = e.dataTransfer.types;
    if (t.includes("reel/id") || t.includes("event/id") || t.includes("text/plain")) {
      e.preventDefault();
      if (dragOver !== dayIso) setDragOver(dayIso);
    }
  };

  const yToTime = (y) => {
    let h = 7 + Math.round(y / 56 * 2) / 2;
    if (h < 7) h = 7;
    if (h > 21.5) h = 21.5;
    const hh = Math.floor(h);
    const mm = (h - hh) === 0.5 ? 30 : 0;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  };

  const handleDrop = (e, dayIso) => {
    e.preventDefault();
    setDragOver(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const eventId = e.dataTransfer.getData("event/id");
    if (eventId) {
      const grabY = parseFloat(e.dataTransfer.getData("event/grabY") || "0");
      onMoveEvent(eventId, dayIso, yToTime(Math.max(0, e.clientY - rect.top - grabY)));
      return;
    }
    const reelId = e.dataTransfer.getData("reel/id") || e.dataTransfer.getData("text/plain");
    if (reelId) onDropReel(reelId, dayIso, yToTime(e.clientY - rect.top));
  };

  return (
    <div className="cal-body">
      <aside className="cal-side">
        <MiniCal anchor={anchor} tripStart={tripStart} tripEnd={tripEnd} onJump={d => setAnchor(d)} onEditTrip={onEditTrip} />

        <div className="side-section">
          <h4>Trip overview</h4>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--ink)" }}>{MONTHS_SHORT[tripStart.getMonth()]} {tripStart.getDate()}</b> →{" "}
            <b style={{ color: "var(--ink)" }}>{MONTHS_SHORT[tripEnd.getMonth()]} {tripEnd.getDate()}</b>
            <div>{Math.round((tripEnd - tripStart) / 86400000) + 1} days · {events.length} planned</div>
            {totalCost > 0 && (
              <div style={{ marginTop: 2 }}>
                Est. total{" "}
                <b style={{ color: "var(--c-art-deep)" }}>${Math.round(totalCost).toLocaleString()}</b>
              </div>
            )}
          </div>
          {events.some(e => e.cost > 0) && (
            <button className="chart-btn" onClick={() => setChartOpen(true)}>
              📊 Cost breakdown by category
            </button>
          )}
        </div>

        <div className="side-section">
          <div className="side-head-row">
            <h4>To schedule</h4>
            <span className="side-count">{unplacedReels.length}</span>
          </div>
          <div className="reel-filters">
            <button
              className={"reel-filter" + (reelFilter === "all" ? " active" : "")}
              onClick={() => setReelFilter("all")}
            >All</button>
            {CATEGORIES.map(c => {
              const n = unplacedReels.filter(r => r.category === c.id).length;
              if (n === 0) return null;
              return (
                <button
                  key={c.id}
                  className={"reel-filter" + (reelFilter === c.id ? " active" : "")}
                  onClick={() => setReelFilter(reelFilter === c.id ? "all" : c.id)}
                  style={{ background: reelFilter === c.id ? c.bg : undefined }}
                  title={c.label}
                >
                  <span>{c.icon}</span>
                  <span>{n}</span>
                </button>
              );
            })}
          </div>
          <div
            className="reel-bubble-list"
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setReorderHint(null);
            }}
          >
            {visibleReels.length === 0 ? (
              <div className="reel-empty">
                {unplacedReels.length === 0 ? "All activities scheduled ✓" : "None in this category"}
              </div>
            ) : (
              visibleReels.map((r, i) => (
                <ReelBubble
                  key={r.id}
                  reel={r}
                  index={i}
                  onEdit={onEditReel}
                  onReorderHover={(idx, before) => {
                    setReorderHint(prev => (prev && prev.index === idx && prev.before === before) ? prev : { index: idx, before });
                  }}
                  onReorderDrop={(draggedId, idx, before) => {
                    setReorderHint(null);
                    if (draggedId === r.id) return;
                    onReorderReels(draggedId, visibleReels[idx].id, before);
                  }}
                  dropIndicator={reorderHint && reorderHint.index === i ? (reorderHint.before ? "before" : "after") : null}
                />
              ))
            )}
          </div>
          <p className="side-hint">drag a bubble onto a day →</p>
        </div>

        <div className="side-section">
          <h4>Categories scheduled</h4>
          <div className="cat-list">
            {CATEGORIES.map(c => {
              const n = events.filter(e => e.category === c.id).length;
              return (
                <div key={c.id} className="cat-item">
                  <span className="cat-dot" style={{ background: c.bg }} />
                  <span>{c.label}</span>
                  <span className="cat-count">{n || ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="cal-main">
        <div className="week-head" style={{ "--day-count": 7 }}>
          <div className="gmt">JST</div>
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            const iso = isoDay(d);
            const dayTotal = dayCosts[iso];
            return (
              <div key={i} className={"day-head" + (isToday ? " today" : "")}>
                <div className="dow">{DOW[d.getDay()]}</div>
                <div className="dnum">{d.getDate()}</div>
                <div className="date-label">{MONTHS_SHORT[d.getMonth()]}</div>
                {dayTotal > 0 && <div className="day-cost">${Math.round(dayTotal).toLocaleString()}</div>}
              </div>
            );
          })}
        </div>

        <div className="week-grid" style={{ "--day-count": 7, "--hours": 16 }}>
          <div className="time-col">
            {hours.map(h => (
              <div key={h} className="time-label">{((h + 11) % 12) + 1} {h >= 12 ? "PM" : "AM"}</div>
            ))}
          </div>
          {days.map((d, i) => {
            const iso = isoDay(d);
            const dayEvents = events.filter(e => e.day === iso);
            const isOver = dragOver === iso;
            return (
              <div
                key={i}
                className={"day-col" + (isOver ? " drag-over" : "")}
                onDragOver={e => handleDragOver(e, iso)}
                onDragLeave={() => setDragOver(prev => prev === iso ? null : prev)}
                onDrop={e => handleDrop(e, iso)}
              >
                {dayEvents.map(ev => <CalEvent key={ev.id} ev={ev} onEdit={onEditEvent} />)}
                {isOver && <div className="drop-hint">drop to add ✿</div>}
              </div>
            );
          })}
        </div>
      </main>

      <CostChartModal open={chartOpen} onClose={() => setChartOpen(false)} events={events} />
    </div>
  );
}
