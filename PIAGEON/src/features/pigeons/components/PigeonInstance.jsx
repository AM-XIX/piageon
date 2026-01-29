import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { PARTY_COLORS } from "../simulation/genetics.js";
import { selectAgent } from "../state/selectionStore.js";

export function PigeonInstance({ agent, baseScene, animations }) {
  const groupRef = useRef();
  const displayedPartyRef = useRef(agent.party);

  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(baseScene);
    clone.scale.setScalar(0.18);
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = 1; 
        }
      }
    });
    return clone;
  }, [baseScene]);

  const { actions, mixer } = useAnimations(animations, groupRef);

  // Gestion des Animations
  useEffect(() => {
    const idle = actions["Idle"];
    if (idle) {
      idle.reset().fadeIn(0.5).play();
      idle.time = Math.random() * idle.getClip().duration;
    }

    const onFinished = (e) => {
      const name = e.action.getClip().name;
      
      if (name === "Converts") {
        displayedPartyRef.current = agent.party;
        const next = agent.velocity.length() > 0.1 ? actions["Walk"] : actions["Idle"];
        if (next) next.reset().fadeIn(0.25).play();
        e.action.fadeOut(0.25);
      } else if (name === "Attack") {
        const next = agent.velocity.length() > 0.1 ? actions["Walk"] : actions["Idle"];
        if (next) next.reset().fadeIn(0.25).play();
        e.action.fadeOut(0.25);
      } else if (name === "Dies") {
        e.action.paused = true;
        e.action.time = e.action.getClip().duration - 0.01;
      }
    };

    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [actions, mixer, agent.party]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Triggers d'animations
    if (agent.triggerDeath) {
      agent.triggerDeath = false;
      mixer.stopAllAction();
      const dieAnim = actions["Dies"];
      if (dieAnim) dieAnim.reset().setLoop(THREE.LoopOnce).setEffectiveTimeScale(1).fadeIn(0.1).play();
    } else if (agent.triggerConvert) {
      agent.triggerConvert = false;
      const convertAnim = actions["Converts"];
      const idle = actions["Idle"];
      const walk = actions["Walk"];
      
      if (convertAnim) {
        if (idle) idle.fadeOut(0.2);
        if (walk) walk.fadeOut(0.2);
        convertAnim.reset().setLoop(THREE.LoopOnce).fadeIn(0.1).play();
      } else {
        displayedPartyRef.current = agent.party;
      }
    } else if (agent.triggerAttack) {
      agent.triggerAttack = false;
      const attackAnim = actions["Attack"];
      const idle = actions["Idle"];
      const walk = actions["Walk"];
      
      if (attackAnim) {
        if (idle) idle.fadeOut(0.2);
        if (walk) walk.fadeOut(0.2);
        attackAnim.reset().setLoop(THREE.LoopOnce).fadeIn(0.1).play();
      }
    }

    // Gestion Walk vs Idle
    const isActionPlaying = 
      (actions["Attack"]?.isRunning()) || 
      (actions["Converts"]?.isRunning()) || 
      (actions["Dies"]?.isRunning());

    if (!isActionPlaying && agent.state !== "dying") {
      const speed = agent.velocity.length();
      const isMoving = speed > 0.1;
      const walkAnim = actions["Walk"];
      const idleAnim = actions["Idle"];

      if (isMoving && walkAnim && !walkAnim.isRunning()) {
        idleAnim?.fadeOut(0.25);
        walkAnim.reset().fadeIn(0.25).play();
      } else if (!isMoving && idleAnim && !idleAnim.isRunning()) {
        walkAnim?.fadeOut(0.25);
        idleAnim.reset().fadeIn(0.25).play();
      }
    }

    // Physique et Position
    if (agent.state !== "dying") {
      const speed = agent.velocity.length();
      if (speed > 0.001) {
        const dir = agent.velocity.clone().normalize();
        const target = agent.position.clone().add(dir);
        target.y = groupRef.current.position.y;
        groupRef.current.lookAt(target);
      }
      groupRef.current.position.copy(agent.position);
      groupRef.current.position.y = agent.position.y + 0.85; 
    }

    // Fade-in à la naissance
    const age = agent.age || 0;
    const opacity = agent.state === "dying" ? 1 : Math.min(age / 1.0, 1);

    const currentParty = displayedPartyRef.current;
    const targetColor = new THREE.Color(PARTY_COLORS[currentParty] || "#cccccc");
    
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        if (!node.userData.isCloned) {
          node.material = node.material.clone();
          node.userData.isCloned = true;
        }
        node.material.color.lerp(targetColor, 0.1);
        node.material.opacity = opacity;
        if (node.material.emissive) {
          node.material.emissive.lerp(targetColor, 0.1);
          node.material.emissiveIntensity = 0.4;
        }
      }
    });
  });

  const leaderLabel = agent.leaderType
    ? agent.leaderType.charAt(0).toUpperCase() + agent.leaderType.slice(1)
    : "Leader";

  return (
    <group ref={groupRef} onClick={() => selectAgent(agent)}>
      <primitive object={model} />
      {agent.isLeader && agent.state !== "dying" && (
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