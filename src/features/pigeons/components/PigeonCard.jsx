import { clearSelection, useSelectedAgent } from "../state/selectionStore.js";
import { PARTY_COLORS } from "../simulation/genetics.js";

export function PigeonCard() {
  const agent = useSelectedAgent();

  if (!agent) return null;

  const color = PARTY_COLORS[agent.party] || "#999";

  return (
    <div className="pigeon-card">
      <div className="card-header">
        <div>
          <div className="card-id">Pigeon #{agent.id}</div>
          <div className="card-party" style={{ color }}>
            {agent.party}
            {agent.isLeader && agent.leaderType ? ` — ${agent.leaderType}` : ""}
          </div>
        </div>
        <button className="card-close" onClick={clearSelection}>
          ✕
        </button>
      </div>

      <div className="card-row">
        <span>Âge</span>
        <strong>{agent.age.toFixed(1)}s</strong>
      </div>

      <div className="card-row">
        <span>Position</span>
        <strong>
          {agent.position
            ? `${agent.position.x.toFixed(1)}, ${agent.position.y.toFixed(1)}, ${agent.position.z.toFixed(1)}`
            : "-"}
        </strong>
      </div>

      <div className="card-row">
        <span>Vitesse</span>
        <strong>
          {agent.velocity
            ? `${agent.velocity.x.toFixed(2)}, ${agent.velocity.y.toFixed(2)}, ${agent.velocity.z.toFixed(2)}`
            : "-"}
        </strong>
      </div>

      <div className="card-section">
        <div className="card-subtitle">Stats</div>
        <div className="card-grid">
          <Stat label="Kills" value={agent.stats.kills} />
          <Stat label="Conversions" value={agent.stats.conversionsDone} />
          <Stat label="Dégâts subis" value={agent.stats.damageTaken} />
          <Stat label="Énergie" value={agent.stats.energySpent.toFixed(1)} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
