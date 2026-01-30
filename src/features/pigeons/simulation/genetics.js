export const GENE_COUNT = 6;

export const IDX_W_SEP = 0; // seperation
export const IDX_W_ALI = 1; // alignement
export const IDX_W_COH = 2; // cohésion
export const IDX_PERCEPTION = 3; // rayon de perception
export const IDX_MAX_SPEED = 4; // vitesse max du pigeon
export const IDX_MAX_FORCE = 5; // force max de l'acceleration

// types de leaders
export const LEADER_TYPES = {
  COMMISSAR: "commissar",
  PRESIDENT: "president",
  KING: "king",
  DICTATOR: "dictator",
  PROPHET: "prophet",
  ELDER: "elder",
};

const LEADER_RADIUS = 5;
const KING_EXCLUSION_RADIUS = 8;
const AGE_THRESHOLD = 80; // maturité par défaut pour certains leaders (plus tardif)
const ANCIENT_AGE = 140; // très vieux pour l'Ancien

// parties politiques
export const PARTIES = {
  COMMUNIST: "communist",
  DEMOCRAT: "democrat",
  FASCIST: "fascist",
  MONARCHIST: "monarchist",
  ANARCHIST: "anarchist",
  NEUTRAL: "neutral",
};


// couleurs des parties
export const PARTY_COLORS = {
  [PARTIES.COMMUNIST]: "#F24822",
  [PARTIES.DEMOCRAT]: "#3DADFF",
  [PARTIES.FASCIST]: "#1E1E1E",
  [PARTIES.MONARCHIST]: "#FFC943",
  [PARTIES.ANARCHIST]: "#874FFF",
  [PARTIES.NEUTRAL]: "#cccccc",
};

// sélectionne une partie aléatoire
export function randomParty() {
  const values = Object.values(PARTIES);
  return values[Math.floor(Math.random() * values.length)];
}

// bornes des gènes
const MIN_GENES = [0.4, 0.15, 0.15, 0.6, 0.6, 0.03]; 
const MAX_GENES = [2.0, 1.6, 1.6, 1.6, 1.4, 0.1];

// création d'un génome aléatoire
export function createRandomGenome() {
  const g = new Float32Array(GENE_COUNT);
  for (let i = 0; i < GENE_COUNT; i++) {
    g[i] = MIN_GENES[i] + Math.random() * (MAX_GENES[i] - MIN_GENES[i]);
  }
  return g;
}

// clamp un gène dans ses bornes
function clampGene(value, idx) {
  return Math.min(MAX_GENES[idx], Math.max(MIN_GENES[idx], value));
}

// crossover entre deux génomes
export function crossoverGenomes(parentA, parentB) {
  const child = new Float32Array(GENE_COUNT);
  for (let i = 0; i < GENE_COUNT; i++) {
    const gene = Math.random() < 0.5 ? parentA[i] : parentB[i];
    child[i] = clampGene(gene, i);
  }
  return child;
}

// mutation d'un génome
export function mutateGenome(
  baseGenome,
  mutationRate = 0.15,
  mutationStrength = 0.25
) {
  const g = new Float32Array(baseGenome);
  for (let i = 0; i < GENE_COUNT; i++) {
    if (Math.random() < mutationRate) {
      const span = MAX_GENES[i] - MIN_GENES[i];
      const delta = (Math.random() * 2 - 1) * span * mutationStrength;
      g[i] = clampGene(g[i] + delta, i);
    }
  }
  return g;
}

// création du génome d'un enfant à partir de ses parents
export function createChildGenome(parentA, parentB, options = {}) {
  const {
    mutationRate = 0.15,
    mutationStrength = 0.25,
  } = options;
  const base = parentB ? crossoverGenomes(parentA, parentB) : new Float32Array(parentA);
  return mutateGenome(base, mutationRate, mutationStrength);
}

// évaluation de la fitness d'un pigeon
export function evaluateFitness(agent) {
  const stats = agent.stats || agent.lifecycle || {}; // permet de supporter d'anciennes versions
  const timeAlive = stats.timeAlive ?? agent.age ?? 0; // 1 point par frame
  const foodScore = (stats.foodEaten ?? 0) * 5; // 5 points par nourriture
  const conversionScore = (stats.conversionsDone ?? 0) * 3; // 3 points par conversion
  const killScore = (stats.kills ?? 0) * 4; // 4 points par kill
  const damagePenalty = (stats.damageTaken ?? 0) * -2; // -2 points par dégât
  const energyPenalty = (stats.energySpent ?? 0) * -0.5; // -0.5 point par unité d'énergie dépensée

  // score total
  return (
    timeAlive +
    foodScore +
    conversionScore +
    killScore +
    damagePenalty +
    energyPenalty
  );
}

// calcul des voisins pour les leaders
export function computeLeaderNeighborhood(agents, radius = LEADER_RADIUS) {
  const radiusSq = radius * radius;
  const info = new Map();
  for (const a of agents) {
    info.set(a.id, {
      followersNearby: 0,
      leadersNearby: [],
      neighbors: [],
    });
  }

  // double boucle pour trouver les voisins
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      const dx = a.position.x - b.position.x;
      const dz = a.position.z - b.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > radiusSq) continue;

      const ai = info.get(a.id);
      const bi = info.get(b.id);

      if (a.party === b.party) {
        ai.followersNearby++;
        bi.followersNearby++;
      }

      if (a.leaderType) bi.leadersNearby.push(a);
      if (b.leaderType) ai.leadersNearby.push(b);
      ai.neighbors.push(b);
      bi.neighbors.push(a);
    }
  }

  return info;
}

// mise à jour des états de leader
export function updateLeaderStates(agents, { neighborInfo, dt = 0.016 } = {}) {
  let changed = false;
  for (const agent of agents) {
    agent.frameEffects = {
      killShield: 0,
      conversionResistance: 0,
      conversionBoost: 0,
      killAura: 0,
    };
  }
  // évaluation des promotions
  for (const agent of agents) {
    const local = neighborInfo?.get(agent.id) ?? { followersNearby: 0, leadersNearby: [] };
    if (!agent.leaderType) {
      const promoted = evaluateLeaderPromotion(agent, local, agents);
      if (promoted) {
        changed = true;
      }
    } else if (agent.leaderType === LEADER_TYPES.PROPHET) {
      applyProphetOscillation(agent, dt);
    }
  }

  // effets d'aura : appliqués sur les voisins proches
  for (const leader of agents) {
    if (!leader.leaderType) continue;
    const local = neighborInfo?.get(leader.id);
    if (!local) continue;
    for (const neighbor of local.neighbors) {
      switch (leader.leaderType) {
        case LEADER_TYPES.COMMISSAR: // boost les communistes
          if (neighbor.party === PARTIES.COMMUNIST) {
            neighbor.frameEffects.conversionBoost += 0.2;
          }
          break;
        case LEADER_TYPES.PRESIDENT: // boost les démocrates
          neighbor.frameEffects.killShield += 0.25;
          if (neighbor.party === PARTIES.NEUTRAL) {
            neighbor.frameEffects.conversionBoost += 0.15;
          }
          break;
        case LEADER_TYPES.KING: // boost les monarchistes
          if (neighbor.party === PARTIES.MONARCHIST) {
            neighbor.frameEffects.killShield += 0.1;
          }
          break;
        case LEADER_TYPES.DICTATOR: // boost les fascistes
          if (neighbor.party === PARTIES.FASCIST) {
            neighbor.frameEffects.killAura += 0.2;
          }
          break;
        case LEADER_TYPES.PROPHET: // boost les anarchistes (réduit pour éviter dominance)
          neighbor.frameEffects.conversionBoost += 0.08;
          break;
        case LEADER_TYPES.ELDER: // boost tout le monde
          neighbor.frameEffects.killShield += 0.3;
          neighbor.frameEffects.conversionResistance += 0.1;
          break;
        default:
          break;
      }
    }
  }
  return changed;
}

// évaluation des conditions de promotion d'un leader
function evaluateLeaderPromotion(agent, local, agents) {
  const stats = agent.stats || {};
  const conversions = stats.conversionsDone ?? 0;
  const kills = stats.kills ?? 0;
  const age = agent.age ?? 0;
  const timeAlive = stats.timeAlive ?? age;
  const followers = local.followersNearby ?? 0;
  if (local.leadersNearby && local.leadersNearby.length > 0) {
    return false; // évite plusieurs leaders dans le même groupe proche
  }

  // conditions spécifiques par partie
  switch (agent.party) {
    case PARTIES.COMMUNIST: // commissaire
      if (conversions >= 15 && followers >= 6 && kills <= 1 && timeAlive >= 50) {
        return applyLeaderBuff(agent, LEADER_TYPES.COMMISSAR);
      }
      break;
    case PARTIES.DEMOCRAT: // président
      if (age >= AGE_THRESHOLD + 20 && followers >= 5 && kills === 0 && conversions >= 4) {
        return applyLeaderBuff(agent, LEADER_TYPES.PRESIDENT);
      }
      break;
    case PARTIES.MONARCHIST: // roi
      if (followers >= 8 && age >= AGE_THRESHOLD + 10 && conversions >= 3 && !kingNearby(agent, agents)) {
        return applyLeaderBuff(agent, LEADER_TYPES.KING);
      }
      break;
    case PARTIES.FASCIST: // dictateur
      if (kills >= 12 && followers >= 5 && conversions >= 2) {
        return applyLeaderBuff(agent, LEADER_TYPES.DICTATOR);
      }
      break;
    case PARTIES.ANARCHIST: // prophète
      if (age >= AGE_THRESHOLD && conversions >= 10 && kills >= 5 && timeAlive >= 70) {
        return applyLeaderBuff(agent, LEADER_TYPES.PROPHET);
      }
      break;
    case PARTIES.NEUTRAL: // ancien
      if (age >= ANCIENT_AGE && kills === 0 && conversions === 0 && followers >= 4) {
        return applyLeaderBuff(agent, LEADER_TYPES.ELDER);
      }
      break;
    default:
      break;
  }
  return false;
}

// vérifie la présence d'un roi à proximité
function kingNearby(agent, agents) {
  const radiusSq = KING_EXCLUSION_RADIUS * KING_EXCLUSION_RADIUS;
  for (const other of agents) {
    if (other === agent) continue;
    if (other.leaderType !== LEADER_TYPES.KING) continue;
    const dx = agent.position.x - other.position.x;
    const dz = agent.position.z - other.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= radiusSq) return true;
  }
  return false;
}

// applique les buffs d'un leader à un agent
function applyLeaderBuff(agent, leaderType) {
  agent.leaderType = leaderType;
  agent.isLeader = true;
  if (!agent.baseGenome) {
    agent.baseGenome = new Float32Array(agent.genome);
  }
  const boosted = new Float32Array(agent.baseGenome);
  const effects = {};

  if (leaderType === LEADER_TYPES.COMMISSAR) { // boost les communistes
    boosted[IDX_W_COH] = clampGene(boosted[IDX_W_COH] * 1.3, IDX_W_COH); // plus de cohésion
    boosted[IDX_W_ALI] = clampGene(boosted[IDX_W_ALI] * 1.2, IDX_W_ALI); // plus d'alignement
    boosted[IDX_MAX_SPEED] = clampGene(boosted[IDX_MAX_SPEED] * 0.9, IDX_MAX_SPEED); // un peu moins rapide
    effects.conversionResistance = 0.35; // résistance aux conversions
    effects.conversionAura = 0.2; // aura de conversion pour les alliés
  } else if (leaderType === LEADER_TYPES.PRESIDENT) { // boost les démocrates
    boosted[IDX_PERCEPTION] = clampGene(boosted[IDX_PERCEPTION] * 1.25, IDX_PERCEPTION); // meilleure perception
    boosted[IDX_MAX_FORCE] = clampGene(boosted[IDX_MAX_FORCE] * 1.15, IDX_MAX_FORCE); // meilleure force
    effects.killShield = 0.35; // bouclier anti-kill
  } else if (leaderType === LEADER_TYPES.KING) { // boost les monarchistes
    boosted[IDX_MAX_SPEED] = clampGene(boosted[IDX_MAX_SPEED] * 1.2, IDX_MAX_SPEED); // plus rapide
    boosted[IDX_MAX_FORCE] = clampGene(boosted[IDX_MAX_FORCE] * 1.25, IDX_MAX_FORCE); // meilleure force
    boosted[IDX_W_COH] = clampGene(boosted[IDX_W_COH] * 0.85, IDX_W_COH); // un peu moins de cohésion
    effects.buffAllies = 0.15; // buff pour les alliés
    effects.killShield = 0.1; // petit bouclier anti-kill
  } else if (leaderType === LEADER_TYPES.DICTATOR) { // boost les fascistes
    boosted[IDX_MAX_FORCE] = clampGene(boosted[IDX_MAX_FORCE] * 1.4, IDX_MAX_FORCE); // beaucoup plus de force
    boosted[IDX_W_SEP] = clampGene(boosted[IDX_W_SEP] * 1.2, IDX_W_SEP); // plus de séparation
    effects.killAura = 0.2; // aura de kill pour les alliés
  } else if (leaderType === LEADER_TYPES.PROPHET) { // boost les anarchistes
    effects.conversionAura = 0.15; // aura réduite pour limiter la dominance
  } else if (leaderType === LEADER_TYPES.ELDER) { // boost les neutres
    boosted[IDX_PERCEPTION] = clampGene(boosted[IDX_PERCEPTION] * 1.8, IDX_PERCEPTION); // bien meilleure perception
    effects.killShield = 0.5; // fort bouclier anti-kill
    effects.peaceAura = 0.2; // aura de résistance aux conversions pour tous
  }

  agent.genome = boosted; // applique le boost génétique
  agent.leaderEffects = effects; // applique les effets de leader
  return true;
}

// oscillation du génome pour le prophète
function applyProphetOscillation(agent, dt) {
  const base = agent.baseGenome || agent.genome;
  const oscillated = new Float32Array(base);
  for (let i = 0; i < GENE_COUNT; i++) {
    const jitter = 1 + (Math.random() * 2 - 1) * 0.2;
    oscillated[i] = clampGene(oscillated[i] * jitter, i);
  }
  agent.genome = oscillated;
  // petite chance de suicide à terme
  if (Math.random() < dt * 0.05) {
    agent.leaderEffects = agent.leaderEffects || {};
    agent.leaderEffects.forceSelfKill = true;
  }
}

// interactions politiques
export function resolveInteractions(
  agents,
  {
    interactionRadius = 1.1,
    worldHalfSize = 50,
    onAgentKilled,
    groundY = 0,
  } = {}
) {
  if (agents.length === 0) return false;

  const radiusSq = interactionRadius * interactionRadius;
  const neighborList = Array.from({ length: agents.length }, () => []);
  const counts = Array.from({ length: agents.length }, () => ({}));

  // Indexation
  for (let i = 0; i < agents.length; i++) {
    // Ignore les morts pour les calculs de voisinage
    if (agents[i].state === "dying") continue; 
    const party = agents[i].party;
    counts[i][party] = (counts[i][party] || 0) + 1;
  }

  // Voisinage
  for (let i = 0; i < agents.length; i++) {
    if (agents[i].state === "dying") continue;
    for (let j = i + 1; j < agents.length; j++) {
      if (agents[j].state === "dying") continue;

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

  // Décision
  for (let i = 0; i < agents.length; i++) {
    if (agents[i].state === "dying") continue;
    const actor = agents[i];
    const actorCounts = counts[i];

    for (const j of neighborList[i]) {
      const target = agents[j];
      const targetCounts = counts[j];

      const action1 = decideInteraction(actor, target, actorCounts, targetCounts);
      applyAction(action1, actor, target, kills, conversions, actorCounts);

      const action2 = decideInteraction(target, actor, targetCounts, actorCounts);
      applyAction(action2, target, actor, kills, conversions, targetCounts);
    }
  }

  // Application des morts
  if (kills.size > 0) {
    for (const id of kills) {
      const agent = agents.find(a => a.id === id);
      if (agent && agent.state !== "dying") {
        agent.state = "dying";
        agent.triggerDeath = true;
        agent.deathTimer = 0;
        changed = true;
      }
    }
  }

  // Application des conversions
  if (conversions.size > 0) {
    for (const [id, newParty] of conversions) {
      const agent = agents.find(a => a.id === id);
      if (agent && agent.state !== "dying" && agent.party !== newParty) {
        agent.party = newParty;
        agent.triggerConvert = true;
        changed = true;
      }
    }
  }

  for (const agent of agents) {
    if (agent.state !== "dying") {
      clampToBounds(agent, worldHalfSize, groundY);
    }
  }

  return changed;
}

function applyAction(action, actor, target, kills, conversions, actorCounts) {
  if (!action) return;

  if (action.type === "kill") {
    if (target.isLeader) {
      const attackers = actorCounts?.[actor.party] ?? 1;
      if (attackers < 3) return;
      kills.add(target.id);
      actor.triggerAttack = true;
    } else {
      const shield = Math.max(0, (target.leaderEffects?.killShield ?? 0) + (target.frameEffects?.killShield ?? 0) - (actor.frameEffects?.killAura ?? 0));
      if (Math.random() < shield) return;
      kills.add(target.id);
      actor.triggerAttack = true;
    }
    if (actor.stats) actor.stats.kills = (actor.stats.kills ?? 0) + 1;
    if (target.stats) target.stats.damageTaken = (target.stats.damageTaken ?? 0) + 1;

  } else if (action.type === "convert") {
    if (target.isLeader) return;
    const baseBlock = 0.15;
    const resist = Math.max(0, baseBlock + (target.leaderEffects?.conversionResistance ?? 0) + (target.frameEffects?.conversionResistance ?? 0) - (actor.frameEffects?.conversionBoost ?? 0));
    if (Math.random() < resist) return;

    if (!kills.has(target.id)) {
      conversions.set(target.id, action.party);
      actor.triggerAttack = true; // L'agresseur attaque pour convertir
      if (actor.stats) actor.stats.conversionsDone = (actor.stats.conversionsDone ?? 0) + 1;
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
      if (target.party === PARTIES.NEUTRAL ||
          target.party === PARTIES.COMMUNIST
      )  {
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
      if (Math.random() < 0.35) {
        return { type: "convert", party: PARTIES.ANARCHIST };
      }
      return { type: "selfKill" };

    default:
      break;
  }

  return null;
}

function clampToBounds(agent, halfSize, groundY) {
  const margin = halfSize - 0.5;
  agent.position.x = Math.max(-margin, Math.min(margin, agent.position.x));
  agent.position.z = Math.max(-margin, Math.min(margin, agent.position.z));
  agent.position.y = groundY;
}
