"use client";
import React, { useState } from "react";

const SESSIONS = [
  { id: "s1",  ageGroup: "Ages 8–10",  timeOfDay: "Morning",   dateRange: "Jun 22 – Jun 26" },
  { id: "s2",  ageGroup: "Ages 8–10",  timeOfDay: "Morning",   dateRange: "Jul 6 – Jul 10" },
  { id: "s3",  ageGroup: "Ages 8–10",  timeOfDay: "Morning",   dateRange: "Jul 13 – Jul 17" },
  { id: "s4",  ageGroup: "Ages 8–10",  timeOfDay: "Afternoon", dateRange: "Jul 6 – Jul 10" },
  { id: "s5",  ageGroup: "Ages 8–10",  timeOfDay: "Afternoon", dateRange: "Jul 27 – Jul 31" },
  { id: "s6",  ageGroup: "Ages 8–10",  timeOfDay: "Afternoon", dateRange: "Aug 10 – Aug 14" },
  { id: "s7",  ageGroup: "Ages 10–13", timeOfDay: "Afternoon", dateRange: "Jul 6 – Jul 10" },
  { id: "s8",  ageGroup: "Ages 10–13", timeOfDay: "Afternoon", dateRange: "Jul 27 – Jul 31" },
  { id: "s9",  ageGroup: "Ages 10–13", timeOfDay: "Afternoon", dateRange: "Aug 10 – Aug 14" },
  { id: "s10", ageGroup: "Ages 13–16", timeOfDay: "Full Day",  dateRange: "Jun 29 – Jul 3" },
  { id: "s11", ageGroup: "Ages 13–16", timeOfDay: "Full Day",  dateRange: "Aug 17 – Aug 21" },
];

// Group by ageGroup → timeOfDay → dates[]
type Group = { ageGroup: string; timeOfDay: string; dates: string[] };

function buildGroups(): Group[] {
  const map = new Map<string, Group>();
  for (const s of SESSIONS) {
    const key = `${s.ageGroup}__${s.timeOfDay}`;
    if (!map.has(key)) map.set(key, { ageGroup: s.ageGroup, timeOfDay: s.timeOfDay, dates: [] });
    map.get(key)!.dates.push(s.dateRange);
  }
  return [...map.values()];
}

const GROUPS = buildGroups();

export default function PrototypeC() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F0EDE8",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "48px 16px",
      fontFamily: "'Google Sans Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 4, overflow: "hidden" }}>

          {/* Banner */}
          <div style={{
            background: "#FEF3C7",
            borderBottom: "1.5px solid #000",
            padding: "11px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#000" }}>outbound</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#000" }}>
                Registration handled externally
              </span>
            </div>
            <button style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#000",
              background: "none",
              border: "1.5px solid #000",
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 2,
            }}>
              Register →
            </button>
          </div>

          {/* Sessions header */}
          <div style={{
            padding: "14px 20px 10px",
            borderBottom: "1.5px solid #000",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
              Sessions — {SESSIONS.length} available
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#000", background: "none", border: "none", cursor: "pointer" }}
            >
              {expanded ? "Collapse ↑" : "Expand ↓"}
            </button>
          </div>

          {expanded && (
            <div>
              {GROUPS.map((g, i) => (
                <div
                  key={`${g.ageGroup}-${g.timeOfDay}`}
                  style={{ borderBottom: i < GROUPS.length - 1 ? "1px solid rgba(0,0,0,0.12)" : "none" }}
                >
                  {/* Row header */}
                  <div style={{
                    padding: "12px 20px 8px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    alignItems: "baseline",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#000", letterSpacing: "-0.01em" }}>
                      {g.ageGroup}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(0,0,0,0.4)",
                      textAlign: "right",
                    }}>
                      {g.timeOfDay}
                    </span>
                  </div>

                  {/* Date pills */}
                  <div style={{ padding: "0 20px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.dates.map(d => (
                      <span
                        key={d}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          color: "#000",
                          border: "1.5px solid #000",
                          borderRadius: 2,
                          padding: "3px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div style={{ borderTop: "1.5px solid #000", padding: "16px 20px" }}>
            <button style={{
              width: "100%",
              padding: "14px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}>
              Register on their website →
            </button>
          </div>

        </div>

        {/* Caption */}
        <p style={{ marginTop: 16, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", textAlign: "center" }}>
          Read-only · External registration
        </p>

      </div>
    </div>
  );
}
