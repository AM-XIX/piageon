import { IDX_PERCEPTION } from "./genetics.js";

export function getClusterForAgent(agent, neighbors) {
  const perception = agent.genome[IDX_PERCEPTION] ?? 3;
  const visionSq = perception * perception;

  let friends = 1;
  let total = 1;

  for (const other of neighbors) {
    if (other === agent) continue;
    const dx = agent.position.x - other.position.x;
    const dz = agent.position.z - other.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > visionSq) continue;

    total++;
    if (other.party === agent.party) friends++;
  }

  const friendRatio = friends / total;

  // 0: ally-heavy (stick together), 1: mixed (balanced), 2: hostile/isolated (fast + evasive)
  if (friendRatio >= 0.6) return 0;
  if (friendRatio >= 0.35) return 1;
  return 2;
}

export function getBoidParamsForCluster(clusterId) {
  switch (clusterId) {
    case 0: // ally-heavy: tight cohesion
      return { maxSpeed: 1.4, wSep: 1.0, wAli: 1.1, wCoh: 1.2, allyPull: 1.1 };
    case 1: // mixed: balanced
      return { maxSpeed: 1.6, wSep: 1.3, wAli: 1.0, wCoh: 0.9, allyPull: 0.9 };
    case 2: // hostile/isolated: faster, avoid others
      return { maxSpeed: 2.0, wSep: 1.8, wAli: 0.9, wCoh: 0.6, allyPull: 0.4 };
    default:
      return { maxSpeed: 2.0, wSep: 1.3, wAli: 1.0, wCoh: 1.0, allyPull: 1.0 };
  }
}
