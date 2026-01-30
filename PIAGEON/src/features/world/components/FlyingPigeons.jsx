import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { usePigeonModel } from "../../pigeons/hooks/usePigeonModel.js";

// Fonction pour générer un bruit fluide
const getFluidNoise = (t, seed) => {
  return (
    Math.sin(t * 0.4 + seed) * 8 + 
    Math.sin(t * 1.1 + seed * 1.5) * 3 + 
    Math.cos(t * 0.8 - seed * 2) * 2
  );
};

const FlyingPigeon = ({ scene, animations, seed, speed, baseHeight, radius, color }) => {
  const group = useRef();
  const targetPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.scale.setScalar(0.15); 
    
    c.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        if (obj.material) {
          obj.material = obj.material.clone();
          obj.material.color.set(color);
          obj.material.emissive = new THREE.Color(color);
          obj.material.emissiveIntensity = 0.5;
        }
      }
    });
    return c;
  }, [scene, color]);

  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const flyAnim = actions["Fly"];
    if (flyAnim) {
      flyAnim.reset().fadeIn(0.5).play();
      flyAnim.timeScale = 1.2 + Math.random() * 0.4;
    }
  }, [actions]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    mixer.update(delta);

    const t = clock.getElapsedTime() * speed;

    const x = Math.cos(t * 0.3 + seed) * radius + getFluidNoise(t, seed);
    const z = Math.sin(t * 0.3 + seed) * radius + getFluidNoise(t, seed + 100);
    const y = baseHeight + getFluidNoise(t * 0.6, seed + 200);

    targetPos.set(x, y, z);
    
    // Interpolation
    group.current.position.lerp(targetPos, 0.1);

    // Orientation : Regard vers l'avant
    const aheadT = t + 0.15;
    const ax = Math.cos(aheadT * 0.3 + seed) * radius + getFluidNoise(aheadT, seed);
    const az = Math.sin(aheadT * 0.3 + seed) * radius + getFluidNoise(aheadT, seed + 100);
    const ay = baseHeight + getFluidNoise(aheadT * 0.6, seed + 200);
    
    lookTarget.set(ax, ay, az);
    group.current.lookAt(lookTarget);

    // Inclinaison lors des virages
    const turnIntensity = Math.sin(t * 0.3 + seed);
    group.current.rotation.z = turnIntensity * 0.5;
  });

  return <primitive object={clone} ref={group} />;
};

export const FlyingPigeons = ({ count = 12 }) => {
  const { scene, animations } = usePigeonModel();

  const pigeonsData = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      seed: i * 543.21,
      speed: 0.2 + Math.random() * 0.5,
      baseHeight: 10 + Math.random() * 2, 
      radius: 35 + Math.random() * 35, 
      color: Math.random() > 0.4 ? "#ffffff" : "#4deeb0"
    }));
  }, [count]);

  if (!scene || !animations) return null;

  return (
    <group>
      {pigeonsData.map((data) => (
        <FlyingPigeon key={data.id} scene={scene} animations={animations} {...data} />
      ))}
    </group>
  );
};