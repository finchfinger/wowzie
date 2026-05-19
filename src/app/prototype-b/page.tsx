"use client";
import React, { useState } from "react";

const SESSIONS = [
  { id: "s1",  ageGroup: "Ages 8–10",  timeOfDay: "Morning",   dateRange: "Jun 22 – Jun 26, 2026" },
  { id: "s2",  ageGroup: "Ages 8–10",  timeOfDay: "Morning",   dateRange: "Jul 6 – Jul 10, 2026" },
  { id: "s3",  ageGroup: "Ages 8–10",  timeOfDay: "Morning",   dateRange: "Jul 13 – Jul 17, 2026" },
  { id: "s4",  ageGroup: "Ages 8–10",  timeOfDay: "Afternoon", dateRange: "Jul 6 – Jul 10, 2026" },
  { id: "s5",  ageGroup: "Ages 8–10",  timeOfDay: "Afternoon", dateRange: "Jul 27 – Jul 31, 2026" },
  { id: "s6",  ageGroup: "Ages 8–10",  timeOfDay: "Afternoon", dateRange: "Aug 10 – Aug 14, 2026" },
  { id: "s7",  ageGroup: "Ages 10–13", timeOfDay: "Afternoon", dateRange: "Jul 6 – Jul 10, 2026" },
  { id: "s8",  ageGroup: "Ages 10–13", timeOfDay: "Afternoon", dateRange: "Jul 27 – Jul 31, 2026" },
  { id: "s9",  ageGroup: "Ages 10–13", timeOfDay: "Afternoon", dateRange: "Aug 10 – Aug 14, 2026" },
  { id: "s10", ageGroup: "Ages 13–16", timeOfDay: "Full Day",  dateRange: "Jun 29 – Jul 3, 2026" },
  { id: "s11", ageGroup: "Ages 13–16", timeOfDay: "Full Day",  dateRange: "Aug 17 – Aug 21, 2026" },
];

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

const ALL_AGES  = unique(SESSIONS.map(s => s.ageGroup));
const ALL_TIMES = unique(SESSIONS.map(s => s.timeOfDay));
const ALL_WEEKS = unique(SESSIONS.map(s => s.dateRange));

function Chip({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 500,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        background: active
          ? "rgba(0,0,0,0.85)"
          : disabled
          ? "rgba(0,0,0,0.03)"
          : "rgba(0,0,0,0.06)",
        color: active
          ? "#fff"
          : disabled
          ? "rgba(0,0,0,0.2)"
          : "rgba(0,0,0,0.75)",
        transition: "background 0.15s, color 0.15s",
        textDecoration: disabled ? "line-through" : "none",
      }}
    >
      {label}
    </button>
  );
}

export default function PrototypeB() {
  const [age, setAge]  = useState("");
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Which times are available for the selected age?
  const availableTimes = new Set(
    SESSIONS
      .filter(s => !age || s.ageGroup === age)
      .map(s => s.timeOfDay)
  );

  // Which weeks are available for selected age + time?
  const availableWeeks = new Set(
    SESSIONS
      .filter(s =>
        (!age  || s.ageGroup  === age) &&
        (!time || s.timeOfDay === time)
      )
      .map(s => s.dateRange)
  );

  const handleAge = (a: string) => {
    const next = a === age ? "" : a;
    setAge(next);
    // clear time if it's no longer valid
    if (time) {
      const stillValid = SESSIONS.some(s => s.ageGroup === next && s.timeOfDay === time);
      if (!stillValid) { setTime(""); setSelected(new Set()); }
    }
  };

  const handleTime = (t: string) => {
    const next = t === time ? "" : t;
    setTime(next);
    setSelected(new Set());
  };

  const toggleWeek = (dateRange: string) => {
    const session = SESSIONS.find(s =>
      s.dateRange === dateRange &&
      (!age  || s.ageGroup  === age) &&
      (!time || s.timeOfDay === time)
    );
    if (!session) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(session.id) ? next.delete(session.id) : next.add(session.id);
      return next;
    });
  };

  const selectedSessions = SESSIONS.filter(s => selected.has(s.id));

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>

        {/* Alert */}
        <div style={{ background: "#FEF9C3", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#92400E" }}>outbound</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#92400E" }}>Registration is handled on their website.</span>
          </div>
          <button style={{ fontSize: 13, fontWeight: 700, color: "#B45309", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", paddingLeft: 12 }}>Register now</button>
        </div>

        {/* Age tier */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Age group</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_AGES.map(a => (
              <Chip key={a} label={a} active={age === a} disabled={false} onClick={() => handleAge(a)} />
            ))}
          </div>
        </div>

        {/* Time tier — always visible, disabled when unavailable */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Time of day</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_TIMES.map(t => (
              <Chip
                key={t}
                label={t}
                active={time === t}
                disabled={!!age && !availableTimes.has(t)}
                onClick={() => handleTime(t)}
              />
            ))}
          </div>
        </div>

        {/* Weeks — always visible, disabled when unavailable */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pick your weeks</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ALL_WEEKS.map(dateRange => {
              const session = SESSIONS.find(s =>
                s.dateRange === dateRange &&
                (!age  || s.ageGroup  === age) &&
                (!time || s.timeOfDay === time)
              );
              const isDisabled = (!!age || !!time) && !availableWeeks.has(dateRange);
              const isChecked = !!session && selected.has(session.id);
              return (
                <button
                  key={dateRange}
                  onClick={() => toggleWeek(dateRange)}
                  disabled={isDisabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "none",
                    cursor: isDisabled ? "default" : "pointer",
                    background: isDisabled ? "transparent" : isChecked ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.03)",
                    boxShadow: isDisabled
                      ? "0 0 0 1px rgba(0,0,0,0.06)"
                      : isChecked
                      ? "0 0 0 2px rgba(0,0,0,0.85)"
                      : "0 0 0 1px rgba(0,0,0,0.1)",
                    textAlign: "left",
                    transition: "box-shadow 0.15s",
                    opacity: isDisabled ? 0.35 : 1,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: "rgba(0,0,0,0.85)",
                      fontVariationSettings: "'FILL' 1",
                      visibility: isChecked ? "visible" : "hidden",
                      flexShrink: 0,
                    }}
                  >
                    check_circle
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: isDisabled ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.85)" }}>
                    {dateRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected summary + CTA */}
        {selected.size > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedSessions.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>{s.ageGroup} · {s.timeOfDay} · {s.dateRange}</span>
                  <button
                    onClick={() => setSelected(prev => { const n = new Set(prev); n.delete(s.id); return n; })}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(0,0,0,0.35)" }}>close</span>
                  </button>
                </div>
              ))}
            </div>
            <button style={{ width: "100%", padding: "16px", borderRadius: 999, background: "#D8B4FE", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600, color: "rgba(0,0,0,0.85)" }}>
              Register on their website
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
