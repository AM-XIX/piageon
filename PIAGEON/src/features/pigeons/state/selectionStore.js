import { useSyncExternalStore } from "react";

let selected = null;
const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

export function subscribeSelection(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSelection() {
  return selected;
}

export function clearSelection() {
  selected = null;
  emit();
}

export function selectAgent(agent) {
  if (!agent) {
    clearSelection();
    return;
  }
  const stats = agent.stats || {};
  const snapshot = {
    id: agent.id,
    party: agent.party,
    leaderType: agent.leaderType,
    isLeader: agent.isLeader,
    age: agent.age ?? 0,
    stats: {
      timeAlive: stats.timeAlive ?? 0,
      foodEaten: stats.foodEaten ?? 0,
      conversionsDone: stats.conversionsDone ?? 0,
      kills: stats.kills ?? 0,
      damageTaken: stats.damageTaken ?? 0,
      energySpent: stats.energySpent ?? 0,
    },
    position: agent.position
      ? { x: agent.position.x, y: agent.position.y, z: agent.position.z }
      : null,
    velocity: agent.velocity
      ? { x: agent.velocity.x, y: agent.velocity.y, z: agent.velocity.z }
      : null,
    genome: agent.genome ? Array.from(agent.genome) : [],
  };
  selected = snapshot;
  emit();
}

export function updateSelectedData(agent) {
  if (!selected || selected.id !== agent.id) return;

  selected = {
    ...selected,
    age: agent.age,
    position: { x: agent.position.x, y: agent.position.y, z: agent.position.z },
    stats: { ...agent.stats }
  };
  emit();
}

export function useSelectedAgent() {
  return useSyncExternalStore(subscribeSelection, getSelection);
}
