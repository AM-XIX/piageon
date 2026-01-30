import React, { useMemo } from 'react';
import * as THREE from 'three';
import { generateLSystem, bushParams } from '../simulation/lSystemGenerator';

const Branch = ({ start, end, radius }) => {
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const height = start.distanceTo(end);
  
  return (
    <mesh position={midpoint} onUpdate={(self) => self.lookAt(end)}>
      <cylinderGeometry args={[radius, radius, height, 5, 1]} />
      <meshStandardMaterial color="#5d4037" flatShading={true} roughness={1} />
    </mesh>
  );
};

export const Bush = ({ position, scale = 1, seed = 0 }) => {
  const { branches, leaves, grass } = useMemo(() => {
    const lString = generateLSystem(2); 
    const { angle, length } = bushParams;
    const segmentLen = length * 2.9; 

    const branches = [];
    const leaves = [];
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentQuat = new THREE.Quaternion();
    const stack = [];

    for (let char of lString) {
      if (char === "F") {
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(currentQuat);
        const nextPos = currentPos.clone().add(dir.multiplyScalar(segmentLen));
        branches.push({ start: currentPos.clone(), end: nextPos.clone() });
        if (Math.random() > 0.7) leaves.push({ pos: currentPos.clone(), type: 'mid' });
        currentPos = nextPos;
      } else if (char === "+") {
        currentQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle + (Math.random() * 0.1)));
      } else if (char === "-") {
        currentQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -angle - (Math.random() * 0.1)));
      } else if (char === "&" || char === "^") {
        const axis = char === "&" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
        currentQuat.multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
      } else if (char === "[") {
        stack.push({ pos: currentPos.clone(), quat: currentQuat.clone() });
      } else if (char === "]") {
        leaves.push({ pos: currentPos.clone(), type: 'tip' });
        const state = stack.pop();
        currentPos = state.pos;
        currentQuat = state.quat;
      }
    }

    const grass = [];
    const grassCount = 25 + Math.floor(Math.random() * 25); 

    for (let i = 0; i < grassCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 2.5; 
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      
      grass.push({
        x, z,
        height: 0.5 + Math.random() * 0.2, 
        rotY: Math.random() * Math.PI,
        rotX: (Math.random() - 0.5) * 0.4, 
        rotZ: (Math.random() - 0.5) * 0.4,
        color: Math.random() > 0.5 ? "#4caf50" : "#47754a" 
      });
    }

    return { branches, leaves, grass };
  }, [seed]);

  return (
    <group position={position} scale={scale}>
      {branches.map((b, i) => (
        <Branch key={`b-${i}`} start={b.start} end={b.end} radius={0.08} />
      ))}
      
      {leaves.map((leaf, i) => {
        const randomScale = 0.8 + Math.random() * 0.6;
        const baseSize = leaf.type === 'tip' ? 1.0 : 0.6;
        return (
          <mesh key={`l-${i}`} position={leaf.pos} scale={[randomScale, randomScale, randomScale]}>
            <icosahedronGeometry args={[baseSize, 0]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#2e7d32" : "#43a047"} flatShading={true} roughness={1} />
          </mesh>
        );
      })}

      {/* --- RENDU DE L'HERBE --- */}
      {grass.map((g, i) => (
        <mesh 
          key={`g-${i}`} 
          position={[g.x, g.height / 2, g.z]} 
          rotation={[g.rotX, g.rotY, g.rotZ]} 
        >
          <coneGeometry args={[0.15, g.height, 3]} />
          <meshStandardMaterial color={g.color} flatShading={true} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};