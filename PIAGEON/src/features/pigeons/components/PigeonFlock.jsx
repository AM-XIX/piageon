import { usePigeonSimulation } from "../hooks/usePigeonSimulation.js";
import { usePigeonModel } from "../hooks/usePigeonModel.js";
import { PigeonInstance } from "./PigeonInstance.jsx";

export function PigeonFlock({
  initialCount = 1000,
  interactionRadius = 3,
  worldHalfSize = 150,
  timeScale = 1,
}) {
  const { agentsRef } = usePigeonSimulation({
    initialCount,
    interactionRadius,
    worldHalfSize,
    timeScale,
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
