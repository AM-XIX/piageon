import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { PARTY_COLORS } from "../simulation/genetics.js";
import { selectAgent } from "../state/selectionStore.js";

const _targetColor = new THREE.Color();
const _dummy = new THREE.Object3D();
const _lookTarget = new THREE.Vector3();

export function PigeonInstance({ agent, baseScene, animations }) {
  const groupRef = useRef();
  const displayedPartyRef = useRef(agent.party);

  const { model, skinnedMeshes } = useMemo(() => {
    const clone = SkeletonUtils.clone(baseScene);
    clone.scale.setScalar(0.15);
    
    const meshes = [];

    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        
        if (obj.material) {
          obj.material = obj.material.clone();
          obj.material.transparent = true;
          obj.material.depthWrite = true; 
        }
        
        meshes.push(obj);
      }
    });

    return { model: clone, skinnedMeshes: meshes };
  }, [baseScene]);

  const { actions, mixer } = useAnimations(animations, groupRef);

  useEffect(() => {
    // Démarrage aléatoire de l'Idle
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

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (agent.triggerDeath) {
      agent.triggerDeath = false;
      mixer.stopAllAction();
      const dieAnim = actions["Dies"];
      if (dieAnim) dieAnim.reset().setLoop(THREE.LoopOnce).setEffectiveTimeScale(1).fadeIn(0.1).play();
    } 
    else if (agent.triggerConvert) {
      agent.triggerConvert = false;
      const convertAnim = actions["Converts"];
      actions["Idle"]?.fadeOut(0.2);
      actions["Walk"]?.fadeOut(0.2);
      if (convertAnim) convertAnim.reset().setLoop(THREE.LoopOnce).fadeIn(0.1).play();
      else displayedPartyRef.current = agent.party;
    } 
    else if (agent.triggerAttack) {
      agent.triggerAttack = false;
      const attackAnim = actions["Attack"];
      actions["Idle"]?.fadeOut(0.2);
      actions["Walk"]?.fadeOut(0.2);
      if (attackAnim) attackAnim.reset().setLoop(THREE.LoopOnce).fadeIn(0.1).play();
    }

    const isActionPlaying = 
      (actions["Attack"]?.isRunning()) || 
      (actions["Converts"]?.isRunning()) || 
      (actions["Dies"]?.isRunning());

    if (!isActionPlaying && agent.state !== "dying") {
      const speedSq = agent.velocity.lengthSq(); 
      const isMoving = speedSq > 0.01;
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

    groupRef.current.position.copy(agent.position);
    
    groupRef.current.position.y = agent.position.y + 0.85;

    if (agent.state !== "dying") {
      const speedSq = agent.velocity.lengthSq();
      if (speedSq > 0.01) {
        _lookTarget.copy(agent.position).add(agent.velocity);
        _lookTarget.y = groupRef.current.position.y; // Garder l'horizon plat
        
        _dummy.position.copy(groupRef.current.position);
        _dummy.lookAt(_lookTarget);
        
        groupRef.current.quaternion.slerp(_dummy.quaternion, 0.15);
      }
    }

    const age = agent.age || 0;
    const opacity = agent.state === "dying" ? 1 : Math.min(age / 1.0, 1);
    const colorHex = PARTY_COLORS[displayedPartyRef.current] || "#cccccc";
    _targetColor.set(colorHex);

    for (let i = 0; i < skinnedMeshes.length; i++) {
      const mat = skinnedMeshes[i].material;
      mat.color.lerp(_targetColor, 0.1);
      mat.opacity = opacity;
      
      if (mat.emissive) {
        mat.emissive.lerp(_targetColor, 0.1);
        mat.emissiveIntensity = 0.4;
      }
    }
  });

  const leaderLabel = agent.leaderType
    ? agent.leaderType.charAt(0).toUpperCase() + agent.leaderType.slice(1)
    : "Leader";

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); selectAgent(agent); }}>
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