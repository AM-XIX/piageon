import React, { useMemo } from 'react';
import { Bush } from './Bush';

export const Vegetation = () => {
  const bushCount = 35; 
  
  const bushes = useMemo(() => {
    return Array.from({ length: bushCount }).map((_, i) => {
      const minRadius = 6; 
      const maxRadius = 18;
      
      const radius = minRadius + Math.sqrt(Math.random()) * (maxRadius - minRadius);
      const angle = Math.random() * Math.PI * 2;
      
      return {
        id: i,
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ],
        scale: 0.3 + Math.random() * 0.6, 
        seed: Math.random()
      };
    });
  }, []);

  return (
    <group name="vegetation-layer">
      {bushes.map(b => (
        <Bush key={b.id} position={b.position} scale={b.scale} seed={b.seed} />
      ))}
    </group>
  );
};