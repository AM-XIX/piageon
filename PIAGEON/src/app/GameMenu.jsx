import { useMemo } from "react";
import { useSimulation } from "../shared/SimulationContext";
import "./gamemenu.css";


//Mettre sur pause
//Légende des partis
//Recommencer
//Accélérarion
//Légende flèches
//Drag pour rotate
//Compteur de partis


export default function GameMenu() {
  const {
    isPaused,
    speed,
    togglePause,
    reset,
    setSpeed,
    parties,
    partyCounts,
  } = useSimulation();

  const total = useMemo(() => {
    return Object.values(partyCounts || {}).reduce((a, b) => a + (b || 0), 0);
  }, [partyCounts]);

  return (
    <aside className="game-menu">
      <div className="menu-top">
        <div className="menu-pill">MENU</div>
      </div>

      {/* Pause / Reprendre + Restart */}
      <div className="menu-scroll">
      <section className="menu-section">
        <div className="menu-row">
          <div className="menu-label">SIMULATION</div>
          <div className="menu-actions">
            <button className="menu-btn" onClick={togglePause}>
              {isPaused ? "REPRENDRE" : "PAUSE"}
            </button>
            <button className="menu-btn menu-btn-ghost" onClick={reset}>
              RECOMMENCER
            </button>
          </div>
        </div>
      </section>

      {/* Accélération */}
      <section className="menu-section">
        <div className="menu-row">
          <div className="menu-label">ACCÉLÉRATION</div>

          <div className="speed-pills">
            {[0.25, 0.5, 1, 2, 4].map((v) => (
              <button
                key={v}
                className={`pill ${speed === v ? "pill-active" : ""}`}
                onClick={() => setSpeed(v)}
              >
                x{v}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Compteur */}
      <section className="menu-section">
        <div className="menu-row">
          <div className="menu-label">COMPTEUR</div>
          <div className="menu-value">
            {total} <span className="muted">cellules/agents</span>
          </div>
        </div>
      </section>

      {/* Légende des partis */}
      <section className="menu-section">
        <div className="menu-row">
          <div className="menu-label">LÉGENDE PARTIS</div>
        </div>

        <div className="legend">
          {parties.map((p) => (
            <div key={p.id} className="legend-item">
              <span className="swatch" style={{ background: p.color }} />
              <span className="legend-name">{p.name}</span>
              <span className="legend-count">{partyCounts?.[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Aide contrôles */}
      <section className="menu-section">
        <div className="menu-row">
          <div className="menu-label">CONTRÔLES</div>
        </div>
        <div className="help">
          <div className="help-line">Flèches / ZQSD : déplacer caméra</div>
          <div className="help-line">Space / Shift : monter / descendre</div>
          <div className="help-line">Drag : rotate (si activé)</div>
        </div>
      </section>
      </div>
    </aside>
  );
}
