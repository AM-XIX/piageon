import { useMemo } from "react";
import { PARTIES, PARTY_COLORS } from "../simulation/genetics.js";
import { usePigeonStats } from "../state/pigeonStore.js";
import "./gamemenu.css";

//Mettre sur pause
//Légende des partis OK
//Recommencer
//Accélérarion
//Légende flèches
//Drag pour rotate
//Compteur de partis OK

export function PigeonHud() {
  const stats = usePigeonStats();

  const partyList = useMemo(() => {
    return Object.values(PARTIES).map((p) => ({
      id: p,
      color: PARTY_COLORS[p] || "#888",
      count: stats.parties?.[p] ?? 0,
    }));
  }, [stats.parties]);

  return (
    <aside className="pigeon-hud">
      <div className="hud-section">
        <div className="hud-title">Pigeons</div>
        <div className="hud-metric">
          <span className="hud-label">Total</span>
          <span className="hud-value">{stats.total ?? 0}</span>
        </div>
        <div className="hud-metric">
          <span className="hud-label">Leaders</span>
          <span className="hud-value">{stats.leaders ?? 0}</span>
        </div>
        <div className="hud-metric">
          <span className="hud-label">Time</span>
          <span className="hud-value">
            {(stats.avgAge ?? 0).toFixed(1)}s
          </span>
        </div>
      </div>

      <div className="hud-section">
        <div className="hud-title">Parties</div>
        <div className="party-list">
          {partyList.map((p) => (
            <div key={p.id} className="party-row">
              <span
                className="party-dot"
                style={{ backgroundColor: p.color }}
              />
              <span className="party-name">{p.id}</span>
              <span className="party-count">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
