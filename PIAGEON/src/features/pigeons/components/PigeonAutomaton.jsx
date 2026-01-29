import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePigeonModel } from "../model/usePigeonModel.js";
import { initCells, stepCells } from "../simulation/cells.js";

const N = 40;
const CELL_SIZE = 0.7;
const TICK_INTERVAL = 0.25;

const COLORS = {
  1: new THREE.Color(0xf44336), // Rouge
  2: new THREE.Color(0x4caf50), // Vert
  3: new THREE.Color(0xffeb3b), // Jaune
  4: new THREE.Color(0x2196f3), // Bleu
  5: new THREE.Color(0x9e9e9e), // Gris
  6: new THREE.Color(0x9c27b0), // Violet
};

export function PigeonAutomaton() {
  const { geometry, material } = usePigeonModel();
  const instancedRef = useRef();

  const currGridRef = useRef(randomizeGrid(N, 0.25));
  const nextGridRef = useRef(new Uint8Array(N * N));

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

    /* SECTION : RENDU DES INSTANCES */
    const half = (N * CELL_SIZE) / 2;
    let instanceIndex = 0;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = x + y * N;
        const type = next[i];

        if (type !== 0) {
          const worldX = x * CELL_SIZE - half;
          const worldZ = y * CELL_SIZE - half;
          
          dummy.position.set(worldX, 0.35, worldZ);
          dummy.scale.set(0.06, 0.06, 0.06);
          dummy.updateMatrix();

          instancedRef.current.setMatrixAt(instanceIndex, dummy.matrix);
          
          const col = COLORS[type] || COLORS[5];
          instancedRef.current.setColorAt(instanceIndex, col);

          instanceIndex++;
        }
      }
    }

    instancedRef.current.count = instanceIndex;
    instancedRef.current.instanceMatrix.needsUpdate = true;
    if (instancedRef.current.instanceColor) {
        instancedRef.current.instanceColor.needsUpdate = true;
    }

    currGridRef.current.set(next);
  });

  if (!geometry || !material) return null;

  return (
    <instancedMesh
      ref={instancedRef}
      args={[geometry, material, N * N]}
      castShadow
      receiveShadow
    />
  );
}
