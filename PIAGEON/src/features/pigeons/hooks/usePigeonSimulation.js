import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { updateBoids } from "../simulation/boids.js";
import { getClusterForAgent } from "../simulation/brain.js";
import { createNeutralPigeon, createRandomPigeon } from "../simulation/pigeonAgent.js";
import { resolveInteractions } from "../simulation/genetics.js";

export function usePigeonSimulation({
  initialCount = 5000,
  interactionRadius = 3,
  worldHalfSize = 150,
  timeScale = 1,
}) {
  const agentsRef = useRef([]);
  const nextIdRef = useRef(initialCount);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (agentsRef.current.length === 0) {
      const agents = [];
      for (let i = 0; i < initialCount; i++) {
        agents.push(createRandomPigeon({ id: i, worldHalfSize }));
      }
      agentsRef.current = agents;
      nextIdRef.current = initialCount;
      forceUpdate((v) => v + 1);
    }
  }, [initialCount, worldHalfSize]);

  useFrame((_, dt) => {
    const scaledDt = dt * timeScale;
    const agents = agentsRef.current;

    // cerveau / clustering
    for (const a of agents) {
      a.clusterId = getClusterForAgent(a, agents);
    }

    // boids
    updateBoids(agents, scaledDt, {
      worldHalfSize,
      wanderStrength: 0.6,
    });

    const changed = resolveInteractions(agents, {
      interactionRadius,
      worldHalfSize,
      onAgentKilled: (deadAgent) => {
        const spawnPos = deadAgent.position.clone();
        spawnPos.x = (Math.random() * 2 - 1) * (worldHalfSize - 1);
        spawnPos.z = (Math.random() * 2 - 1) * (worldHalfSize - 1);
        spawnPos.y = 0;
        agents.push(
          createNeutralPigeon({
            id: nextIdRef.current++,
            position: spawnPos,
          })
        );
      },
    });
    if (changed) {
      forceUpdate((v) => v + 1);
    }

    // contraintes simples
    for (const a of agents) {
      a.age += scaledDt;
    }
  });

  return { agentsRef };
}
