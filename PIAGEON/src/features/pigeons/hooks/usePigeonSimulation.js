import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { updateBoids } from "../simulation/boids.js";
import { getClusterForAgent } from "../simulation/brain.js";
import { createNeutralPigeon, createRandomPigeon } from "../simulation/pigeonAgent.js";
import { resolveInteractions } from "../simulation/genetics.js";

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
      for (let i = 0; i < initialCount; i++) {
        agents.push(createRandomPigeon({ id: i, worldHalfSize, groundY }));
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
      groundY,
    });

    const changed = resolveInteractions(agents, {
      interactionRadius,
      worldHalfSize,
      groundY,
      onAgentKilled: (deadAgent) => {
        const radius = worldHalfSize - 1;
        const r = Math.sqrt(Math.random()) * radius;
        const theta = Math.random() * Math.PI * 2;
        const spawnPos = deadAgent.position.clone();
        spawnPos.set(
          Math.cos(theta) * r,
          groundY,
          Math.sin(theta) * r
        );
        agents.push(
          createNeutralPigeon({
            id: nextIdRef.current++,
            position: spawnPos,
            groundY,
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
