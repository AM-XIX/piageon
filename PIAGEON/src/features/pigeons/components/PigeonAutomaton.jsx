import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePigeonModel } from "../model/usePigeonModel.js";
import { randomizeGrid, stepGrid } from "../simulation/cellularPigeons.js";

const N = 40;
const CELL_SIZE = 0.7;
const TICK_INTERVAL = 0.25;

export function PigeonAutomaton() {
  const { geometry, material } = usePigeonModel();
  const instancedRef = useRef();

  const currGridRef = useRef(randomizeGrid(N, 0.25));
  const nextGridRef = useRef(new Uint8Array(currGridRef.current.length));

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!instancedRef.current || !geometry) return;

    timeRef.current += delta;
    if (timeRef.current < TICK_INTERVAL) return;
    timeRef.current = 0;

    const curr = currGridRef.current;
    const next = nextGridRef.current;

    stepGrid(curr, next, N);

    const half = (N * CELL_SIZE) / 2;
    let instanceIndex = 0;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (next[i] === 1) {
          const worldX = x * CELL_SIZE - half;
          const worldZ = y * CELL_SIZE - half;
          const worldY = 0.35;

          dummy.position.set(worldX, worldY, worldZ);
          const s = 0.06; 
          dummy.scale.set(s, s, s); 
          
          dummy.updateMatrix();
          instancedRef.current.setMatrixAt(instanceIndex, dummy.matrix);
          instanceIndex++;
        }
      }
    }

    instancedRef.current.count = instanceIndex;
    instancedRef.current.instanceMatrix.needsUpdate = true;

    currGridRef.current = next;
    nextGridRef.current = curr;
  });

  const maxInstances = N * N;

  if (!geometry || !material) return null;

  return (
    <instancedMesh
      ref={instancedRef}
      args={[geometry, material, maxInstances]}
      castShadow
      receiveShadow
    />
  );
}