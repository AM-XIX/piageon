import { usePigeonSimulation } from "../hooks/usePigeonSimulation.js";
import { usePigeonModel } from "../hooks/usePigeonModel.js";
import { PigeonInstance } from "./PigeonInstance.jsx";

export function PigeonFlock({
  initialCount = 100,
  interactionRadius = 3,
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
