// ===== Root App =====
import { useState, useEffect } from 'react'
import { parseIsoDay, startOfWeek, addDays, MONTHS, MONTHS_SHORT } from './data.js'
import { Login, Toast, Avatar } from './components.jsx'
import Calendar from './calendar.jsx'
import { ReelsBoard, ReelModal } from './reels.jsx'
import EventModal from './event_modal.jsx'
import TripDatesModal from './trip_modal.jsx'
import { supabase } from './lib/supabase.js'

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}
const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60 + m; };
const fromMin = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
};

function applyReelOrder(reels, order) {
  if (!order || order.length === 0) return reels;
  const pos = Object.fromEntries(order.map((id, i) => [id, i]));
  return [...reels].sort((a, b) => (pos[a.id] ?? 9999) - (pos[b.id] ?? 9999));
}

const DEFAULT_SETTINGS = { tripStart: "2026-05-10", tripEnd: "2026-05-23", roster: [], reelOrder: [] };

export default function App() {
  const [user, setUser] = useState(() => sessionStorage.getItem("nyc-user") || null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [reels, setReels] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("calendar");
  const [anchor, setAnchor] = useState(() => parseIsoDay(DEFAULT_SETTINGS.tripStart));
  const [reelModal, setReelModal] = useState({ open: false, id: null });
  const [eventModal, setEventModal] = useState({ open: false, id: null });
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (m) => setToast(m);

  // ---- Initial load ----
  useEffect(() => {
    async function boot() {
      const [{ data: sData }, { data: rData }, { data: eData }] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 1).single(),
        supabase.from('reels').select('*'),
        supabase.from('events').select('*'),
      ]);
      if (sData) {
        const s = { tripStart: sData.trip_start, tripEnd: sData.trip_end, roster: sData.roster || [], reelOrder: sData.reel_order || [] };
        setSettings(s);
        setAnchor(parseIsoDay(s.tripStart));
      }
      if (rData) setReels(applyReelOrder(rData, sData?.reel_order || []));
      if (eData) setEvents(eData.map(e => ({ ...e, start: e.start_time, end: e.end_time, fromReel: e.from_reel })));
      setLoading(false);
    }
    boot();
  }, []);

  // ---- Real-time subscriptions ----
  useEffect(() => {
    const reelsSub = supabase.channel('reels-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, (payload) => {
        if (payload.eventType === 'INSERT')      setReels(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setReels(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        else if (payload.eventType === 'DELETE') setReels(prev => prev.filter(r => r.id !== payload.old.id));
      }).subscribe();

    const norm = (e) => ({ ...e, start: e.start_time, end: e.end_time, fromReel: e.from_reel });
    const eventsSub = supabase.channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        if (payload.eventType === 'INSERT')      setEvents(prev => [...prev, norm(payload.new)]);
        else if (payload.eventType === 'UPDATE') setEvents(prev => prev.map(e => e.id === payload.new.id ? norm(payload.new) : e));
        else if (payload.eventType === 'DELETE') setEvents(prev => prev.filter(e => e.id !== payload.old.id));
      }).subscribe();

    const settingsSub = supabase.channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        const s = payload.new;
        setSettings({ tripStart: s.trip_start, tripEnd: s.trip_end, roster: s.roster || [], reelOrder: s.reel_order || [] });
        setReels(prev => applyReelOrder(prev, s.reel_order || []));
      }).subscribe();

    return () => { reelsSub.unsubscribe(); eventsSub.unsubscribe(); settingsSub.unsubscribe(); };
  }, []);

  // ---- Auth ----
  const signIn = async (name) => {
    setUser(name);
    sessionStorage.setItem("nyc-user", name);
    const newRoster = settings.roster.includes(name) ? settings.roster : [...settings.roster, name];
    if (newRoster.length !== settings.roster.length) {
      setSettings(s => ({ ...s, roster: newRoster }));
      await supabase.from('settings').update({ roster: newRoster }).eq('id', 1);
    }
  };
  const signOut = () => { setUser(null); sessionStorage.removeItem("nyc-user"); };

  // ---- Activities (reels) ----
  const addReel = async ({ url, title, note, category, cost }) => {
    const id = uid("r");
    const newReel = { id, url, title, note, category, added_by: user || "Anon", placed_day: null, cost: cost || 0 };
    const newOrder = [...(settings.reelOrder || []), id];
    setSettings(s => ({ ...s, reelOrder: newOrder }));
    await supabase.from('reels').insert(newReel);
    await supabase.from('settings').update({ reel_order: newOrder }).eq('id', 1);
    showToast("Activity pinned to the wall ✿");
  };

  const updateReel = async (id, patch) => {
    setReels(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setEvents(prev => prev.map(e => e.fromReel === id
      ? { ...e, title: patch.title ?? e.title, category: patch.category ?? e.category, cost: patch.cost ?? e.cost }
      : e));
    const dbPatch = {};
    if (patch.title !== undefined)     dbPatch.title     = patch.title;
    if (patch.note !== undefined)      dbPatch.note      = patch.note;
    if (patch.url !== undefined)       dbPatch.url       = patch.url;
    if (patch.category !== undefined)  dbPatch.category  = patch.category;
    if (patch.cost !== undefined)      dbPatch.cost      = patch.cost;
    if (patch.placed_day !== undefined) dbPatch.placed_day = patch.placed_day;
    await supabase.from('reels').update(dbPatch).eq('id', id);
    // Sync title/category/cost to linked calendar events
    const evFields = {};
    if (patch.title !== undefined)    evFields.title    = patch.title;
    if (patch.category !== undefined) evFields.category = patch.category;
    if (patch.cost !== undefined)     evFields.cost     = patch.cost;
    if (Object.keys(evFields).length) {
      for (const e of events.filter(e => e.fromReel === id)) {
        await supabase.from('events').update(evFields).eq('id', e.id);
      }
    }
    showToast("Activity updated ✎");
  };

  const deleteReel = async (id) => {
    setReels(prev => prev.filter(r => r.id !== id));
    setEvents(prev => prev.filter(e => e.fromReel !== id));
    const newOrder = (settings.reelOrder || []).filter(rid => rid !== id);
    setSettings(s => ({ ...s, reelOrder: newOrder }));
    await supabase.from('events').delete().eq('from_reel', id);
    await supabase.from('reels').delete().eq('id', id);
    await supabase.from('settings').update({ reel_order: newOrder }).eq('id', 1);
    showToast("Activity removed");
  };

  // ---- Events ----
  const dropReelOnDay = async (reelId, dayIso, startTime) => {
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    const start = startTime || "10:00";
    const end = fromMin(toMin(start) + 60);
    const id = uid("e");
    const newEv = {
      id, title: reel.title, note: reel.note || "",
      day: dayIso, start, end,
      category: reel.category,
      addedBy: user || "Anon", fromReel: reelId,
      cost: reel.cost || 0,
    };
    setReels(prev => prev.map(r => r.id === reelId ? { ...r, placed_day: dayIso } : r));
    await supabase.from('events').insert({
      id, title: newEv.title, note: newEv.note,
      day: dayIso, start_time: start, end_time: end,
      category: newEv.category, added_by: newEv.addedBy, from_reel: reelId,
      cost: newEv.cost,
    });
    await supabase.from('reels').update({ placed_day: dayIso }).eq('id', reelId);
    showToast("Added to itinerary ✓");
  };

  const saveEvent = async (updated) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    await supabase.from('events').update({
      title: updated.title, note: updated.note,
      day: updated.day, start_time: updated.start, end_time: updated.end,
      category: updated.category, cost: updated.cost || 0,
    }).eq('id', updated.id);
    showToast("Activity updated ✎");
  };

  const moveEvent = async (eventId, dayIso, startTime) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    const durMin = toMin(ev.end) - toMin(ev.start);
    const newStart = startTime || ev.start;
    const newEnd = fromMin(toMin(newStart) + durMin);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, day: dayIso, start: newStart, end: newEnd } : e));
    if (ev.fromReel) setReels(prev => prev.map(r => r.id === ev.fromReel ? { ...r, placed_day: dayIso } : r));
    await supabase.from('events').update({ day: dayIso, start_time: newStart, end_time: newEnd }).eq('id', eventId);
    if (ev.fromReel) await supabase.from('reels').update({ placed_day: dayIso }).eq('id', ev.fromReel);
  };

  const reorderReels = async (draggedId, targetId, before) => {
    if (draggedId === targetId) return;
    const order = [...(settings.reelOrder.length ? settings.reelOrder : reels.map(r => r.id))];
    const fromIdx = order.indexOf(draggedId);
    if (fromIdx < 0) return;
    order.splice(fromIdx, 1);
    let toIdx = order.indexOf(targetId);
    if (toIdx < 0) return;
    if (!before) toIdx += 1;
    order.splice(toIdx, 0, draggedId);
    setSettings(s => ({ ...s, reelOrder: order }));
    setReels(prev => applyReelOrder(prev, order));
    await supabase.from('settings').update({ reel_order: order }).eq('id', 1);
  };

  const saveTripDates = async (newStart, newEnd) => {
    setSettings(s => ({ ...s, tripStart: newStart, tripEnd: newEnd }));
    setAnchor(parseIsoDay(newStart));
    setTripModalOpen(false);
    await supabase.from('settings').update({ trip_start: newStart, trip_end: newEnd }).eq('id', 1);
    showToast("Trip dates updated ✎");
  };

  const removeEvent = async (eventId) => {
    const ev = events.find(e => e.id === eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (ev?.fromReel) setReels(prev => prev.map(r => r.id === ev.fromReel ? { ...r, placed_day: null } : r));
    await supabase.from('events').delete().eq('id', eventId);
    if (ev?.fromReel) await supabase.from('reels').update({ placed_day: null }).eq('id', ev.fromReel);
    showToast("Removed from itinerary");
  };

  // ---- Render ----
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Nunito, sans-serif", color: "var(--ink-soft)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Caveat, cursive", fontSize: 48, marginBottom: 8 }}>🗽</div>
          <div style={{ fontSize: 14 }}>Loading your trip...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login roster={settings.roster} onSignIn={signIn} />;
  }

  const tripStartDate = parseIsoDay(settings.tripStart);
  const tripEndDate   = parseIsoDay(settings.tripEnd);
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const normalizedReels = reels.map(r => ({
    ...r,
    addedBy: r.added_by ?? r.addedBy,
    placedDay: r.placed_day ?? r.placedDay,
    cost: r.cost || 0,
  }));

  const currentReel = reelModal.id ? normalizedReels.find(r => r.id === reelModal.id) : null;
  const currentEvent = eventModal.id ? events.find(e => e.id === eventModal.id) : null;

  const openAddReel = () => setReelModal({ open: true, id: null });
  const openEditReel = (id) => setReelModal({ open: true, id });
  const closeReelModal = () => setReelModal({ open: false, id: null });
  const openEditEvent = (id) => setEventModal({ open: true, id });
  const closeEventModal = () => setEventModal({ open: false, id: null });

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">NY</div>
          <span>NYC Trip</span>
        </div>

        {view === "calendar" && (
          <>
            <button className="today-btn" onClick={() => setAnchor(tripStartDate)}>Trip start</button>
            <div className="nav-arrows">
              <button className="nav-arrow" onClick={() => setAnchor(d => addDays(d, -7))} aria-label="Previous week">‹</button>
              <button className="nav-arrow" onClick={() => setAnchor(d => addDays(d, 7))} aria-label="Next week">›</button>
            </div>
            <div className="range-label">{rangeLabel}</div>
          </>
        )}

        <div className="spacer" />

        <div className="seg" role="tablist">
          <button className={"seg-btn" + (view === "calendar" ? " active" : "")}
                  onClick={() => setView("calendar")}>📅 Calendar</button>
          <button className={"seg-btn" + (view === "reels" ? " active" : "")}
                  onClick={() => setView("reels")}>
            📍 Activities
            {normalizedReels.filter(r => !r.placedDay).length > 0 && (
              <span style={{
                marginLeft: 4, background: "var(--c-food)", color: "#5a1a17",
                padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 800,
              }}>{normalizedReels.filter(r => !r.placedDay).length}</span>
            )}
          </button>
        </div>

        <button className="upload-btn" onClick={openAddReel}>＋ Add activity</button>

        <div className="user-pill" title="Sign out">
          <Avatar name={user} />
          <span className="name">{user}</span>
          <button className="signout" onClick={signOut}>switch</button>
        </div>
      </div>

      {view === "calendar" ? (
        <Calendar
          anchor={anchor}
          setAnchor={setAnchor}
          events={events}
          reels={normalizedReels}
          tripStart={tripStartDate}
          tripEnd={tripEndDate}
          onDropReel={dropReelOnDay}
          onMoveEvent={moveEvent}
          onReorderReels={reorderReels}
          onEditEvent={openEditEvent}
          onEditReel={openEditReel}
          onEditTrip={() => setTripModalOpen(true)}
        />
      ) : (
        <ReelsBoard
          reels={normalizedReels}
          onDelete={deleteReel}
          onEdit={openEditReel}
          openUpload={openAddReel}
        />
      )}

      <ReelModal
        open={reelModal.open}
        reel={currentReel}
        onClose={closeReelModal}
        onSubmit={(data) => {
          if (currentReel) updateReel(currentReel.id, data);
          else addReel(data);
          closeReelModal();
        }}
        onDelete={(id) => { deleteReel(id); closeReelModal(); }}
      />

      <EventModal
        open={eventModal.open}
        event={currentEvent}
        onClose={closeEventModal}
        onSave={(updated) => { saveEvent(updated); closeEventModal(); }}
        onDelete={(id) => { removeEvent(id); closeEventModal(); }}
      />

      <TripDatesModal
        open={tripModalOpen}
        start={settings.tripStart}
        end={settings.tripEnd}
        onClose={() => setTripModalOpen(false)}
        onSave={saveTripDates}
      />

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
