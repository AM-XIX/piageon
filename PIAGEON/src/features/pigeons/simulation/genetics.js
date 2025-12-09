export const GENE_COUNT = 6;

export const IDX_W_SEP = 0; // seperation
export const IDX_W_ALI = 1; // alignement
export const IDX_W_COH = 2; // cohésion
export const IDX_PERCEPTION = 3; // rayon de perception
export const IDX_MAX_SPEED = 4; // vitesse max du pigeon
export const IDX_MAX_FORCE = 5; // force max de l'acceleration

export const PARTIES = {
  COMMUNIST: "communist",
  DEMOCRAT: "democrat",
  FASCIST: "fascist",
  MONARCHIST: "monarchist",
  ANARCHIST: "anarchist",
  NEUTRAL: "neutral",
};

export const PARTY_COLORS = {
  [PARTIES.COMMUNIST]: "#F24822",
  [PARTIES.DEMOCRAT]: "#3DADFF",
  [PARTIES.FASCIST]: "#1E1E1E",
  [PARTIES.MONARCHIST]: "#FFC943",
  [PARTIES.ANARCHIST]: "#874FFF",
  [PARTIES.NEUTRAL]: "#cccccc",
};

export function randomParty() {
  const values = Object.values(PARTIES);
  return values[Math.floor(Math.random() * values.length)];
}

const MIN_GENES = [0.5, 0.2, 0.2, 1.5, 1.0, 0.01];
const MAX_GENES = [3.0, 2.0, 2.0, 5.0, 3.0, 0.1];

export function createRandomGenome() {
  const g = new Float32Array(GENE_COUNT);
  for (let i = 0; i < GENE_COUNT; i++) {
    g[i] = MIN_GENES[i] + Math.random() * (MAX_GENES[i] - MIN_GENES[i]);
  }
  return g;
}

// interactions politiques
export function resolveInteractions(
  agents,
  {
    interactionRadius = 3,
    worldHalfSize = 50,
    onAgentKilled,
  } = {}
) {
  if (agents.length === 0) return false;

  const radiusSq = interactionRadius * interactionRadius;
  const neighborList = Array.from({ length: agents.length }, () => []);
  const counts = Array.from({ length: agents.length }, () => ({}));

  for (let i = 0; i < agents.length; i++) {
    const party = agents[i].party;
    counts[i][party] = (counts[i][party] || 0) + 1;
  }

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      const dx = a.position.x - b.position.x;
      const dz = a.position.z - b.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= radiusSq) {
        neighborList[i].push(j);
        neighborList[j].push(i);
        counts[i][b.party] = (counts[i][b.party] || 0) + 1;
        counts[j][a.party] = (counts[j][a.party] || 0) + 1;
      }
    }
  }

  const kills = new Set();
  const conversions = new Map();
  let changed = false;

  for (let i = 0; i < agents.length; i++) {
    const actor = agents[i];
    const actorCounts = counts[i];

    for (const j of neighborList[i]) {
      if (j <= i) continue;
      const target = agents[j];
      const targetCounts = counts[j];

      const action1 = decideInteraction(actor, target, actorCounts, targetCounts);
      applyAction(action1, actor, target, kills, conversions);

      const action2 = decideInteraction(target, actor, targetCounts, actorCounts);
      applyAction(action2, target, actor, kills, conversions);
    }
  }

  if (kills.size > 0) {
    for (let i = agents.length - 1; i >= 0; i--) {
      const dying = agents[i];
      if (kills.has(dying.id)) {
        agents.splice(i, 1);
        if (onAgentKilled) {
          onAgentKilled(dying);
        }
        changed = true;
      }
    }
  }

  if (conversions.size > 0) {
    for (const agent of agents) {
      const nextParty = conversions.get(agent.id);
      if (nextParty && !kills.has(agent.id) && agent.party !== nextParty) {
        agent.party = nextParty;
        changed = true;
      }
    }
  }

  for (const agent of agents) {
    clampToBounds(agent, worldHalfSize);
  }

  return changed;
}

function applyAction(action, actor, target, kills, conversions) {
  if (!action) return;
  if (action.type === "kill") {
    kills.add(target.id);
  } else if (action.type === "convert") {
    if (!kills.has(target.id)) {
      conversions.set(target.id, action.party);
    }
  } else if (action.type === "selfKill") {
    kills.add(actor.id);
  }
}

function decideInteraction(actor, target, actorCounts, targetCounts) {
  if (actor.party === PARTIES.NEUTRAL) return null;

  if (
    target.party === PARTIES.ANARCHIST &&
    (actorCounts[actor.party] || 0) > (targetCounts[PARTIES.ANARCHIST] || 0)
  ) {
    return { type: "kill" };
  }

  switch (actor.party) {
    case PARTIES.COMMUNIST:
      if (
        target.party === PARTIES.NEUTRAL ||
        target.party === PARTIES.DEMOCRAT
      ) {
        return { type: "convert", party: PARTIES.COMMUNIST };
      }
      if (target.party === PARTIES.MONARCHIST) {
        const communistCount = actorCounts[PARTIES.COMMUNIST] || 0;
        const monarchistCount = targetCounts[PARTIES.MONARCHIST] || 0;
        if (communistCount - monarchistCount >= 2) {
          return { type: "kill" };
        }
      }
      break;

    case PARTIES.DEMOCRAT:
      if (
        target.party === PARTIES.NEUTRAL ||
        target.party === PARTIES.MONARCHIST
      ) {
        return { type: "convert", party: PARTIES.DEMOCRAT };
      }
      if (target.party === PARTIES.FASCIST) {
        const democratCount = actorCounts[PARTIES.DEMOCRAT] || 0;
        const fascistCount = targetCounts[PARTIES.FASCIST] || 0;
        if (democratCount > fascistCount) {
          return { type: "kill" };
        }
      }
      break;

    case PARTIES.MONARCHIST:
      if (
        target.party === PARTIES.NEUTRAL ||
        target.party === PARTIES.FASCIST
      ) {
        return { type: "convert", party: PARTIES.MONARCHIST };
      }
      if (target.party === PARTIES.COMMUNIST) {
        const communistCount = targetCounts[PARTIES.COMMUNIST] || 0;
        const monarchistCount = actorCounts[PARTIES.MONARCHIST] || 0;
        if (communistCount - monarchistCount <= 2) {
          return { type: "kill" };
        }
      }
      break;

    case PARTIES.FASCIST: {
      if (target.party === PARTIES.COMMUNIST) {
        // 70% chance to convert a communist, otherwise kill them
        if (Math.random() < 0.7) {
          return { type: "convert", party: PARTIES.FASCIST };
        }
        return { type: "kill" };
      }

      if (target.party === PARTIES.NEUTRAL) {
        return { type: "convert", party: PARTIES.FASCIST };
      }

      if (target.party === PARTIES.DEMOCRAT) {
        const fascistCount = actorCounts[PARTIES.FASCIST] || 0;
        const democratCount = targetCounts[PARTIES.DEMOCRAT] || 0;
        if (fascistCount >= democratCount) {
          return { type: "kill" };
        }
      }
      break;
    }

    case PARTIES.ANARCHIST:
      if (actor.id === target.id) return null;
      if (target.party === PARTIES.NEUTRAL) {
        return { type: "convert", party: PARTIES.ANARCHIST };
      }
      // 50% chance to convert non-neutral, otherwise die
      if (Math.random() < 0.5) {
        return { type: "convert", party: PARTIES.ANARCHIST };
      }
      return { type: "selfKill" };

    default:
      break;
  }

  return null;
}

function clampToBounds(agent, halfSize) {
  const margin = halfSize - 0.5;
  agent.position.x = Math.max(-margin, Math.min(margin, agent.position.x));
  agent.position.z = Math.max(-margin, Math.min(margin, agent.position.z));
  agent.position.y = 0;
}
