import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { generateLSystem, bushParams } from '../simulation/lSystemGenerator';

const Branch = ({ start, end, radius }) => {
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const height = direction.length();
  
  return (
    <mesh position={midpoint} onUpdate={(self) => self.lookAt(end)}>
      <cylinderGeometry args={[radius * 1.1, radius, height, 6]} />
      <meshStandardMaterial color="#2d1b0d" />
    </mesh>
  );
};

export const Bush = ({ position, scale = 1, seed = 0 }) => {
  const { branches, leaves } = useMemo(() => {
    const lString = generateLSystem(2); 
    const { angle, length } = bushParams;
    
    const branches = [];
    const leaves = [];
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentQuat = new THREE.Quaternion();
    const stack = [];

    for (let char of lString) {
      if (char === "F") {
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(currentQuat);
        const nextPos = currentPos.clone().add(dir.multiplyScalar(length));
        branches.push({ start: currentPos.clone(), end: nextPos.clone() });
        
        if (Math.random() > 0.3) leaves.push({ pos: currentPos.clone(), type: 'mid' });
        
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
    return { branches, leaves };
  }, [seed]);

  return (
    <group position={position} scale={scale}>
      {branches.map((b, i) => (
        <Branch key={i} start={b.start} end={b.end} radius={0.06} />
      ))}
      
      {leaves.map((leaf, i) => {
        // ----- SCALING
        const randomScale = [
          0.6 + Math.random() * 0.8, 
          0.4 + Math.random() * 0.6, 
          0.6 + Math.random() * 0.8 
        ];

        return (
          <mesh key={`l-${i}`} position={leaf.pos} scale={randomScale}>
            <sphereGeometry args={[leaf.type === 'tip' ? 0.7 : 0.4, 8, 8]} />
            <meshStandardMaterial 
              color={i % 2 === 0 ? "#2e7d32" : "#388e3c"} 
              roughness={1} 
            />
          </mesh>
        );
      })}
    </group>
  );
};