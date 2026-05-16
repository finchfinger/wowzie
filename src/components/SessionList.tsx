import React from "react";
import { Divider } from "./ui/Divider";
import type { RegistrationSession } from "./RegistrationPanel";

type Props = {
  sessions: RegistrationSession[];
};

type TimeRow = { sessionType: string; ageGroups: string[] };
type SessionGroup = { dateRange: string; rows: TimeRow[] };

function buildGroups(sessions: RegistrationSession[]): SessionGroup[] {
  const dateMap = new Map<string, Map<string, Set<string>>>();

  for (const s of sessions) {
    if (!dateMap.has(s.dateRange)) dateMap.set(s.dateRange, new Map());
    const timeKey = s.sessionType ?? s.name;
    const byTime = dateMap.get(s.dateRange)!;
    if (!byTime.has(timeKey)) byTime.set(timeKey, new Set());
    if (s.ageGroup) byTime.get(timeKey)!.add(s.ageGroup);
  }

  const toMs = (dr: string) => new Date(dr.split("–")[0].trim()).getTime();

  return [...dateMap.entries()].sort(([a], [b]) => toMs(a) - toMs(b)).map(([dateRange, byTime]) => ({
    dateRange,
    rows: [...byTime.entries()].map(([sessionType, ages]) => ({
      sessionType,
      ageGroups: [...ages],
    })),
  }));
}

function formatAgeGroups(groups: string[]): string {
  if (groups.length === 0) return "";
  if (groups.length === 1) return groups[0];
  const stripped = groups.map(g => g.replace(/^Ages\s*/i, ""));
  return `Ages ${stripped.join(" & ")}`;
}

export function SessionList({ sessions }: Props) {
  const groups = buildGroups(sessions);

  return (
    <dl style={{ margin: 0, padding: 0 }}>
      {groups.map((group, gi) => (
        <div key={group.dateRange}>
          {/* Session header */}
          <div style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "14px 0 10px",
            borderBottom: "1.5px solid rgba(0,0,0,0.85)",
          }}>
            <dt style={{ fontSize: 15, fontWeight: 700, color: "rgba(0,0,0,0.85)", margin: 0 }}>
              Session {gi + 1}
            </dt>
            <span style={{ fontSize: 14, color: "rgba(0,0,0,0.55)" }}>{group.dateRange}</span>
          </div>

          {/* Time rows */}
          {group.rows.map((row, ri) => (
            <React.Fragment key={row.sessionType}>
              <dd style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                margin: 0,
                padding: "11px 0",
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(0,0,0,0.85)" }}>
                  {row.sessionType}
                </span>
                {row.ageGroups.length > 0 && (
                  <span style={{ fontSize: 14, color: "rgba(0,0,0,0.55)" }}>
                    {formatAgeGroups(row.ageGroups)}
                  </span>
                )}
              </dd>
              {ri < group.rows.length - 1 && <Divider variant="dotted" />}
            </React.Fragment>
          ))}
        </div>
      ))}
    </dl>
  );
}
