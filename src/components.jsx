// ===== Reusable bits + Login screen =====
import { useState, useEffect } from 'react'
import { CATEGORIES, CAT_BY_ID, colorFor, initialsOf } from './data.js'

export function Avatar({ name, size = 28 }) {
  const bg = colorFor(name);
  return (
    <div className="avatar" style={{ background: bg, width: size, height: size, fontSize: size * 0.42 }}>
      {initialsOf(name)}
    </div>
  );
}

export function CategoryTag({ catId, small }) {
  const c = CAT_BY_ID[catId];
  if (!c) return null;
  return (
    <span className="tag" style={{ background: c.bg, color: c.ink, fontSize: small ? 9 : 10 }}>
      <span style={{ marginRight: 4 }}>{c.icon}</span>{c.label}
    </span>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  return <div className="toast">{msg}</div>;
}

export function Login({ roster, onSignIn }) {
  const [name, setName] = useState("");
  const submit = () => {
    const v = name.trim();
    if (v) onSignIn(v);
  };
  return (
    <div className="login-wrap">
      <div className="login-deco">
        <div className="blob" style={{ background: "var(--c-food)",   top: "8%",  left: "12%", transform: "rotate(12deg)" }} />
        <div className="blob" style={{ background: "var(--c-sight)",  top: "70%", left: "6%",  width: 240, height: 240 }} />
        <div className="blob" style={{ background: "var(--c-art)",    top: "20%", right: "10%", width: 220, height: 220 }} />
        <div className="blob" style={{ background: "var(--c-shop)",   bottom: "12%", right: "16%" }} />
      </div>

      <div className="login-card">
        <div className="login-stamp">NYC '26</div>
        <h1>NYC Trip<br/>Planner</h1>
        <p className="sub">Throw in reels, drag onto days, eat your way through New York. First — who's planning?</p>
        <label className="login-label">Your name</label>
        <input
          className="login-input"
          autoFocus
          placeholder="e.g. Jonathan"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
        />
        <button className="login-btn" onClick={submit} disabled={!name.trim()}>
          Let's plan →
        </button>

        {roster.length > 0 && (
          <div className="login-roster">
            <h4>Continue as</h4>
            <div className="login-roster-list">
              {roster.map(n => (
                <button key={n} className="login-roster-chip" onClick={() => onSignIn(n)}>
                  <span style={{ marginRight: 6 }}>{initialsOf(n)}</span>{n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
