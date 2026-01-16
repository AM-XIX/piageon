import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { PARTY_COLORS } from "../simulation/genetics.js";

export function PigeonInstance({ agent, baseScene }) {
  const model = useMemo(() => baseScene.clone(), [baseScene]);
  const bounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    return { box, size };
  }, [model]);
  const footOffset = useMemo(() => -bounds.box.min.y, [bounds]);
  const ref = useRef();

  // permet de recolorer le pigeon selon sa faction
  useEffect(() => {
    const fallback = PARTY_COLORS.neutral || "#cccccc";
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone();
        const color = PARTY_COLORS[agent.party] || fallback;
        if (node.material.color) {
          node.material.color.set(color);
        }
        if (node.material.emissive) {
          node.material.emissive.set(color);
          node.material.emissiveIntensity = 0.4;
        }
      }
    });
  }, [model, agent.party]);

  useFrame(() => {
    if (!ref.current) return;

    const speed = agent.velocity.length();
    if (speed > 0.001) {
      const dir = agent.velocity.clone().normalize();
      const target = agent.position.clone().add(dir);
      target.y = ref.current.position.y; // keep head level
      ref.current.lookAt(target);
    }

    ref.current.position.copy(agent.position);
    ref.current.position.y = agent.position.y + footOffset;
  });

  const leaderLabel = agent.leaderType
    ? agent.leaderType.charAt(0).toUpperCase() + agent.leaderType.slice(1)
    : "Leader";

  return (
    <group ref={ref}>
      <primitive object={model} />
      {agent.isLeader && (
        <Text
          position={[0, bounds.box.max.y + bounds.size.y * 0.2, 0]}
          fontSize={bounds.size.y * 0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={bounds.size.y * 0.01}
          outlineColor="#000000"
        >
          {leaderLabel}
        </Text>
      )}
    </group>
  );
}
