import { PARTIES } from "../simulation/genetics.js";
import { useSyncExternalStore } from "react";

let state = {
  total: 0,
  parties: {},
  leaders: 0,
  avgAge: 0,
};

const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

export function setPigeonStats(next) {
  state = next;
  emit();
}

export function usePigeonStats() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function computePigeonStats(agents) {
  if (!agents || agents.length === 0) {
    setPigeonStats({ total: 0, parties: {}, leaders: 0, avgAge: 0 });
    return;
  }
  const parties = {};
  let leaders = 0;
  let ageSum = 0;

  for (const p of agents) {
    parties[p.party] = (parties[p.party] || 0) + 1;
    if (p.isLeader) leaders++;
    ageSum += p.age ?? 0;
  }

  // ensure all parties appear with 0
  for (const key of Object.values(PARTIES)) {
    parties[key] = parties[key] || 0;
  }

  setPigeonStats({
    total: agents.length,
    parties,
    leaders,
    avgAge: ageSum / agents.length,
  });
}
