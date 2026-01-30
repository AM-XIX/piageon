import { usePigeonSimulation } from "../hooks/usePigeonSimulation.js";
import { usePigeonModel } from "../hooks/usePigeonModel.js";
import { PigeonInstance } from "./PigeonInstance.jsx";
import { useFrame } from "@react-three/fiber";
import { computePigeonStats } from "../state/pigeonStore.js";
import { getSelection, updateSelectedData } from "../state/selectionStore.js";
import { useRef } from "react";

export function PigeonFlock({
  initialCount = 60,
  interactionRadius = 1.2,
  worldHalfSize = 35,
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
  
  const { scene, animations } = usePigeonModel(); 
  const accumRef = useRef(0);

  useFrame((state, dt) => {
    agentsRef.current.forEach(agent => {
      agent.age += dt * timeScale;
    });

    accumRef.current += dt;
    
    if (accumRef.current >= 0.1) {
      accumRef.current = 0;

      // Mise à jour globale (HUD)
      computePigeonStats(agentsRef.current);

      // Mise à jour de l'agent sélectionné (PigeonCard)
      const currentSelection = getSelection();
      if (currentSelection) {
        const realAgent = agentsRef.current.find(a => a.id === currentSelection.id);
        if (realAgent) {
          updateSelectedData(realAgent);
        }
      }
    }
  });

  return (
    <group>
      {agentsRef.current.map((agent) => (
        <PigeonInstance
          key={agent.id}
          agent={agent}
          baseScene={scene}
          animations={animations}
        />
      ))}
    </group>
  );
}