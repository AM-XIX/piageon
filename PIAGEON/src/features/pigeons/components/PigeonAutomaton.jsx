import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { usePigeonModel } from "../model/usePigeonModel.js";
import { randomizeGrid, stepGrid } from "../simulation/cellularPigeons.js";
import { useSimulation } from "../../../shared/SimulationContext.jsx";

const N = 40;
const CELL_SIZE = 0.7;
const TICK_INTERVAL = 0.25;

const COLORS = {
  1: new THREE.Color(0xf44336),
  2: new THREE.Color(0x4caf50),
  3: new THREE.Color(0xffeb3b),
  4: new THREE.Color(0x2196f3),
  5: new THREE.Color(0x9e9e9e),
  6: new THREE.Color(0x9c27b0),
};

function computePartyCounts(grid) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (v !== 0) counts[v]++;
  }
  return counts;
}

function samePartyCounts(a, b) {
  return (
    a?.[1] === b?.[1] &&
    a?.[2] === b?.[2] &&
    a?.[3] === b?.[3] &&
    a?.[4] === b?.[4] &&
    a?.[5] === b?.[5] &&
    a?.[6] === b?.[6]
  );
}

export function PigeonAutomaton() {
  const { geometry, material } = usePigeonModel();
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // GRILLES (Uint8Array)
  const currGridRef = useRef(randomizeGrid(N, 0.25));
  const nextGridRef = useRef(new Uint8Array(N * N));

  // SIMULATION CONTEXT
  const { isPaused, speed, resetToken, setPartyCounts } = useSimulation();

  // accumulateur pour vitesse
  const accum = useRef(0);

  // ✅ throttle stats
  const statsCooldown = useRef(0);
  const lastCountsRef = useRef({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

  useEffect(() => {
    currGridRef.current = randomizeGrid(N, 0.25);
    nextGridRef.current.fill(0);
    accum.current = 0;

    const initial = computePartyCounts(currGridRef.current);
    lastCountsRef.current = initial;
    setPartyCounts(initial);

    statsCooldown.current = 0;

    if (instancedRef.current) {
      instancedRef.current.count = 0;
      instancedRef.current.instanceMatrix.needsUpdate = true;
      if (instancedRef.current.instanceColor) {
        instancedRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [resetToken, setPartyCounts]);

  useFrame((_, delta) => {
    if (!instancedRef.current || !geometry) return;
    if (isPaused) return;

    accum.current += delta * speed;

    let finalNext = null;

    while (accum.current >= TICK_INTERVAL) {
      accum.current -= TICK_INTERVAL;

      const curr = currGridRef.current;
      const next = nextGridRef.current;

      stepGrid(curr, next, N);
      finalNext = next;

      // rendu instancié
      const half = (N * CELL_SIZE) / 2;
      let instanceIndex = 0;

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = x + y * N;
          const type = next[i];

          if (type !== 0) {
            dummy.position.set(x * CELL_SIZE - half, 0.35, y * CELL_SIZE - half);
            dummy.scale.setScalar(0.06);
            dummy.updateMatrix();

            instancedRef.current.setMatrixAt(instanceIndex, dummy.matrix);
            instancedRef.current.setColorAt(instanceIndex, COLORS[type]);
            instanceIndex++;
          }
        }
      }

      instancedRef.current.count = instanceIndex;
      instancedRef.current.instanceMatrix.needsUpdate = true;
      if (instancedRef.current.instanceColor) {
        instancedRef.current.instanceColor.needsUpdate = true;
      }

      curr.set(next);
    }

    // ✅ stats seulement 4 fois/sec
    statsCooldown.current -= delta;
    if (finalNext && statsCooldown.current <= 0) {
      statsCooldown.current = 0.25;

      const counts = computePartyCounts(finalNext);
      if (!samePartyCounts(lastCountsRef.current, counts)) {
        lastCountsRef.current = counts;
        setPartyCounts(counts);
      }
    }
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
