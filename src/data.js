// ===== Constants + Helpers + LocalStorage =====

export const CATEGORIES = [
  { id: "food",    label: "Food",         bg: "var(--c-food)",   ink: "#5a1a17", deep: "var(--c-food-deep)",   icon: "🍕" },
  { id: "sight",   label: "Sightseeing",  bg: "var(--c-sight)",  ink: "#1D4A45", deep: "var(--c-sight-deep)",  icon: "🗽" },
  { id: "city",    label: "City",         bg: "var(--c-city)",   ink: "#2c4760", deep: "var(--c-city-deep)",   icon: "🏙" },
  { id: "shop",    label: "Shopping",     bg: "var(--c-shop)",   ink: "#583761", deep: "var(--c-shop-deep)",   icon: "🛍" },
  { id: "nature",  label: "Nature",       bg: "var(--c-nature)", ink: "#3f5326", deep: "var(--c-nature-deep)", icon: "🌿" },
  { id: "night",   label: "Nightlife",    bg: "var(--c-night)",  ink: "#3b3266", deep: "var(--c-night-deep)",  icon: "🌙" },
  { id: "art",     label: "Arts",         bg: "var(--c-art)",    ink: "#6B4818", deep: "var(--c-art-deep)",    icon: "🎨" },
  { id: "stay",    label: "Stay",         bg: "var(--c-stay)",   ink: "#5b3a1d", deep: "var(--c-stay-deep)",   icon: "🛏" },
];

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export const DEFAULT_TRIP_START = "2026-05-10";
export const DEFAULT_TRIP_END   = "2026-05-23";

export function parseIsoDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const AVATAR_COLORS = [
  "#D98B7E", "#7BA383", "#6E96BA", "#A87BB0",
  "#C99A4C", "#87A35A", "#7A6FA8", "#B98654",
];

export function colorFor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export const DOW = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function addDays(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2,"0")} ${ap}`;
}

const LS_KEY = "nyc-trip-state-v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
}

export function seed() {
  return {
    user: null,
    roster: [],
    tripStart: DEFAULT_TRIP_START,
    tripEnd: DEFAULT_TRIP_END,
    reels: [
      { id: "r1", title: "$1 pizza slice on Bleecker St",   url: "https://instagram.com/reel/abc1", category: "food",   note: "Joe's Pizza, get there early", addedBy: "Sample", placedDay: null },
      { id: "r2", title: "Statue of Liberty sunrise ferry", url: "https://instagram.com/reel/abc2", category: "sight",  note: "First ferry at 8:30am",        addedBy: "Sample", placedDay: null },
      { id: "r3", title: "Times Square midnight walk",      url: "https://instagram.com/reel/abc3", category: "city",   note: "Way less crowded after 11pm",  addedBy: "Sample", placedDay: null },
      { id: "r4", title: "Vintage hunting in Brooklyn",     url: "https://instagram.com/reel/abc4", category: "shop",   note: "Beacon's Closet is a must",    addedBy: "Sample", placedDay: null },
      { id: "r5", title: "Central Park rowboat hour",       url: "https://instagram.com/reel/abc5", category: "nature", note: "$20/hr, cash only",            addedBy: "Sample", placedDay: null },
      { id: "r6", title: "Rooftop bar crawl in LES",        url: "https://instagram.com/reel/abc6", category: "night",  note: "Start at 230 Fifth",           addedBy: "Sample", placedDay: null },
      { id: "r7", title: "MoMA permanent collection",       url: "https://instagram.com/reel/abc7", category: "art",    note: "Free Fridays 5:30–9pm",        addedBy: "Sample", placedDay: null },
      { id: "r8", title: "Bagel + lox at Russ & Daughters", url: "https://instagram.com/reel/abc8", category: "food",   note: "Get the Classic",              addedBy: "Sample", placedDay: null },
      { id: "r9", title: "High Line end-to-end walk",       url: "https://instagram.com/reel/abc9", category: "sight",  note: "Best views at the Spur",       addedBy: "Sample", placedDay: null },
    ],
    events: [
      { id: "e1", title: "Land at JFK",              day: "2026-05-10", start: "15:00", end: "17:00", category: "stay", addedBy: "Sample" },
      { id: "e2", title: "Check in to hotel",        day: "2026-05-10", start: "18:30", end: "19:30", category: "stay", addedBy: "Sample" },
    ],
  };
}
