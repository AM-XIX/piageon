import { usePigeonSimulation } from "../hooks/usePigeonSimulation.js";
import { usePigeonModel } from "../hooks/usePigeonModel.js";
import { PigeonInstance } from "./PigeonInstance.jsx";
import { useFrame } from "@react-three/fiber";
import { computePigeonStats } from "../state/pigeonStore.js";
import { useRef } from "react";

export function PigeonFlock({
  initialCount = 100,
  interactionRadius = 1.2,
  worldHalfSize = 40,
  timeScale = 1,
  groundY = 18,
}) {
  const { agentsRef } = usePigeonSimulation({
    initialCount,
    interactionRadius,
    worldHalfSize,
    timeScale,
    groundY,
  });
  const { scene } = usePigeonModel();
  const accumRef = useRef(0);

  useFrame((_, dt) => {
    accumRef.current += dt;
    if (accumRef.current < 0.25) return;
    accumRef.current = 0;
    computePigeonStats(agentsRef.current);
  });

  return (
    <group>
      {agentsRef.current.map((agent) => (
        <PigeonInstance
          key={agent.id}
          agent={agent}
          baseScene={scene}
        />
      ))}
    </group>
  );
}
