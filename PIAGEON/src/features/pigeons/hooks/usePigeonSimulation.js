import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { updateBoids } from "../simulation/boids.js";
import { getClusterForAgent } from "../simulation/brain.js";
import { createNeutralPigeon, createPigeonAgent, createRandomPigeon } from "../simulation/pigeonAgent.js";
import { PARTIES, computeLeaderNeighborhood, createChildGenome, evaluateFitness, randomParty, resolveInteractions, updateLeaderStates } from "../simulation/genetics.js";

export function usePigeonSimulation({
  initialCount = 100,
  interactionRadius = 3,
  worldHalfSize = 40,
  timeScale = 1,
  groundY = 18,
}) {
  const agentsRef = useRef([]);
  const nextIdRef = useRef(initialCount);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (agentsRef.current.length === 0) {
      const agents = [];
      const partyCycle = shuffleParties();
      for (let i = 0; i < initialCount; i++) {
        const party = partyCycle[i % partyCycle.length];
        agents.push(createRandomPigeon({ id: i, worldHalfSize, groundY, party }));
        if (i % partyCycle.length === partyCycle.length - 1) {
          partyCycle.push(...shuffleParties()); // extend cycle to keep mix
        }
      }
      agentsRef.current = agents;
      nextIdRef.current = initialCount;
      forceUpdate((v) => v + 1);
    }
  }, [initialCount, worldHalfSize]);

  useFrame((_, dt) => {
    const scaledDt = dt * timeScale;
    const agents = agentsRef.current;
    const respawnAgent = (deadAgent) => {
      const radius = worldHalfSize - 1;
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * Math.PI * 2;
      const spawnPos = deadAgent.position.clone();
      spawnPos.set(Math.cos(theta) * r, groundY, Math.sin(theta) * r);
      const child = createChildFromPool({
        agents,
        id: nextIdRef.current++,
        position: spawnPos,
        groundY,
      });
      agents.push(child);
    };

    // cerveau / clustering
    for (const a of agents) {
      a.clusterId = getClusterForAgent(a, agents);
    }

    // boids
    updateBoids(agents, scaledDt, {
      worldHalfSize,
      wanderStrength: 0.35,
      groundY,
    });

    // leaders : mutation et effets locaux
    const neighborInfo = computeLeaderNeighborhood(agents);
    const leadersChanged = updateLeaderStates(agents, {
      neighborInfo,
      dt: scaledDt,
    });
    for (let i = agents.length - 1; i >= 0; i--) {
      const a = agents[i];
      if (a.leaderEffects?.forceSelfKill) {
        agents.splice(i, 1);
        respawnAgent(a);
      }
    }

    const changed = resolveInteractions(agents, {
      interactionRadius,
      worldHalfSize,
      groundY,
      onAgentKilled: (deadAgent) => {
        respawnAgent(deadAgent);
      },
    });
    if (changed || leadersChanged) {
      forceUpdate((v) => v + 1);
    }

    // contraintes simples
    for (const a of agents) {
      a.age = (a.age ?? 0) + scaledDt;
      if (a.stats) a.stats.timeAlive = a.age;
    }
  });

  return { agentsRef };
}

function createChildFromPool({ agents, id, position, groundY }) {
  const parents = pickParentsByFitness(agents, 2);

  if (parents.length === 0) {
    return createNeutralPigeon({ id, position, groundY });
  }

  const [p1, p2] = parents;
  const genome = p2
    ? createChildGenome(p1.genome, p2.genome)
    : createChildGenome(p1.genome);

  // Le parent le plus fit transmet aussi l'idéologie pour favoriser les stratégies gagnantes
  const fitParty = p2 && evaluateFitness(p2) > evaluateFitness(p1) ? p2.party : p1.party;
  const party = fitParty || randomParty();

  return createPigeonAgent({
    id,
    position,
    genome,
    party,
    groundY,
  });
}

function pickParentsByFitness(agents, count = 2) {
  if (agents.length === 0) return [];

  const scored = agents.map((agent) => {
    const fitness = Math.max(0.001, evaluateFitness(agent));
    return { agent, fitness };
  });

  const total = scored.reduce((sum, s) => sum + s.fitness, 0);
  const pickOne = () => {
    let roll = Math.random() * total;
    for (const s of scored) {
      roll -= s.fitness;
      if (roll <= 0) return s.agent;
    }
    return scored[scored.length - 1].agent;
  };

  const parents = [];
  for (let i = 0; i < count; i++) {
    parents.push(pickOne());
  }
  return parents;
}

function shuffleParties() {
  const arr = Object.values(PARTIES);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
