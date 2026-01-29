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
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  }, [baseScene]);

  const { actions, mixer } = useAnimations(animations, groupRef);

  // --- Gestion des Animations ---
  useEffect(() => {
    const idleAction = actions["Idle"];
    if (idleAction) {
      idleAction.reset().fadeIn(0.5).play();
      // Désynchronisation pour éviter que tous les pigeons battent des ailes en même temps
      idleAction.time = Math.random() * idleAction.getClip().duration;
    }

    const onFinished = (e) => {
      // Retour à l'Idle après une attaque
      if (idleAction && e.action !== idleAction) {
        idleAction.reset().fadeIn(0.25).play();
        e.action.fadeOut(0.25);
      }
    };
    
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [actions, mixer]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Déclenchement Attaque
    if (agent.triggerAttack) {
      agent.triggerAttack = false;
      const attack = actions["Attack"];
      
      if (attack) {
        mixer.stopAllAction();
        attack.reset().setLoop(THREE.LoopOnce).fadeIn(0.05).play();
      }
    }

    // Mouvement
    const speed = agent.velocity.length();
    if (speed > 0.001) {
      const dir = agent.velocity.clone().normalize();
      const target = agent.position.clone().add(dir);
      target.y = groupRef.current.position.y;
      groupRef.current.lookAt(target);
    }

    // Couleurs
    const targetColor = new THREE.Color(PARTY_COLORS[agent.party] || "#cccccc");
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        if (!node.userData.isCloned) {
          node.material = node.material.clone();
          node.userData.isCloned = true;
        }
        node.material.color.lerp(targetColor, 0.1);
        if (node.material.emissive) {
          node.material.emissive.lerp(targetColor, 0.1);
          node.material.emissiveIntensity = 0.4;
        }
      }
    });

    // Position & Offset Hauteur
    groupRef.current.position.copy(agent.position);
    groupRef.current.position.y = agent.position.y + 1.8;
  });

  const leaderLabel = agent.leaderType
    ? agent.leaderType.charAt(0).toUpperCase() + agent.leaderType.slice(1)
    : "Leader";

  return (
    <group ref={groupRef} onClick={() => selectAgent(agent)}>
      <primitive object={model} />
      {agent.isLeader && (
        <Text
          position={[0, 2.8, 0]}
          fontSize={0.5}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {leaderLabel}
        </Text>
      )}
    </group>
  );
}