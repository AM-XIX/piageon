import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { PARTY_COLORS } from "../simulation/genetics.js";
import { selectAgent } from "../state/selectionStore.js";

export function PigeonInstance({ agent, baseScene, animations }) {
  const groupRef = useRef();
  
  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(baseScene);
    clone.scale.setScalar(0.18);
    return clone;
  }, [baseScene]);

  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const action = actions["Flying"] || actions[Object.keys(actions)[0]];
    if (action) {
      action.reset().fadeIn(0.5).play();
      action.time = Math.random() * action.getClip().duration; 
    }
  }, [actions]);

  const { bounds, footOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const yOffset = -box.min.y;
    return { bounds: { box, size }, footOffset: yOffset };
  }, [model]);

  useEffect(() => {
    const fallback = PARTY_COLORS.neutral || "#cccccc";
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone();
        const color = PARTY_COLORS[agent.party] || fallback;
        if (node.material.color) node.material.color.set(color);
        if (node.material.emissive) {
          node.material.emissive.set(color);
          node.material.emissiveIntensity = 0.4;
        }
      }
    });
  }, [model, agent.party]);

  useFrame(() => {
    if (!groupRef.current) return;

    const speed = agent.velocity.length();
    if (speed > 0.001) {
      const dir = agent.velocity.clone().normalize();
      const target = agent.position.clone().add(dir);
      target.y = groupRef.current.position.y; 
      groupRef.current.lookAt(target);
    }

    groupRef.current.position.copy(agent.position);
    groupRef.current.position.y = agent.position.y + footOffset;
  });

  const leaderLabel = agent.leaderType
    ? agent.leaderType.charAt(0).toUpperCase() + agent.leaderType.slice(1)
    : "Leader";

  return (
    <group ref={groupRef} onClick={() => selectAgent(agent)}>
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