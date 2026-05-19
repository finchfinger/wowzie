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

export default function Prototype() {
  const [age, setAge] = useState("");
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ageOptions = unique(SESSIONS.map(s => s.ageGroup));

  const timeOptions = unique(
    SESSIONS
      .filter(s => !age || s.ageGroup === age)
      .map(s => s.timeOfDay)
  );

  const weekOptions = SESSIONS.filter(s =>
    (!age || s.ageGroup === age) &&
    (!time || s.timeOfDay === time)
  );

  const handleAge = (a: string) => {
    setAge(a);
    setTime("");
    setSelected(new Set());
  };

  const handleTime = (t: string) => {
    setTime(t);
    setSelected(new Set());
  };

  const toggleWeek = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
            {ageOptions.map(a => (
              <button
                key={a}
                onClick={() => handleAge(a === age ? "" : a)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: age === a ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.06)",
                  color: age === a ? "#fff" : "rgba(0,0,0,0.75)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Time tier — only appears after age is picked */}
        {age && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Time of day</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {timeOptions.map(t => (
                <button
                  key={t}
                  onClick={() => handleTime(t === time ? "" : t)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: time === t ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.06)",
                    color: time === t ? "#fff" : "rgba(0,0,0,0.75)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weeks — only appears after time is picked */}
        {time && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pick your weeks</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weekOptions.map(s => {
                const checked = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleWeek(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      background: checked ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.03)",
                      boxShadow: checked ? "0 0 0 2px rgba(0,0,0,0.85)" : "0 0 0 1px rgba(0,0,0,0.1)",
                      textAlign: "left",
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 20,
                        color: "rgba(0,0,0,0.85)",
                        fontVariationSettings: "'FILL' 1",
                        visibility: checked ? "visible" : "hidden",
                        flexShrink: 0,
                      }}
                    >
                      check_circle
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.85)" }}>{s.dateRange}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected summary + CTA */}
        {selected.size > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedSessions.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>{s.ageGroup} · {s.timeOfDay} · {s.dateRange}</span>
                  <button onClick={() => toggleWeek(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
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

        {/* Empty state CTA when nothing selected yet */}
        {selected.size === 0 && time && weekOptions.length === 0 && (
          <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center" }}>No sessions available for this combination.</p>
        )}

      </div>
    </div>
  );
}
