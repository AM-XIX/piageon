import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PARTY_COLORS } from "../simulation/genetics.js";

export function PigeonInstance({ agent, baseScene }) {
  const model = useMemo(() => baseScene.clone(), [baseScene]);
  const footOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    return -box.min.y; // lift so feet sit on ground
  }, [model]);
  const ref = useRef();

  // recolor meshes based on party
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

  return <primitive ref={ref} object={model} />;
}
