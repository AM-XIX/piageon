// src/features/pigeons/components/PigeonAutomaton.jsx
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

  if (!geometry || !material) {
    return null;
  }

  const currGridRef = useRef(randomizeGrid(N, 0.25));
  const nextGridRef = useRef(new Uint8Array(currGridRef.current.length));

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!instancedRef.current) return;

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
          const worldY = 0;

          dummy.position.set(worldX, worldY, worldZ);
          dummy.rotation.y = 0;
          dummy.scale.set(0.4, 0.4, 0.4);
          dummy.updateMatrix();

          instancedRef.current.setMatrixAt(instanceIndex, dummy.matrix);
          instanceIndex++;
        }
      }
    }

    instancedRef.current.count = instanceIndex;
    instancedRef.current.instanceMatrix.needsUpdate = true;

    // swap
    currGridRef.current = next;
    nextGridRef.current = curr;
  });

  const maxInstances = N * N;

  return (
    <instancedMesh
      ref={instancedRef}
      args={[geometry, material, maxInstances]}
      castShadow
      receiveShadow
    />
  );
}