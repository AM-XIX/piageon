"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createNoise2D, createNoise3D } from "simplex-noise";

// --- UTILITAIRES ---
function mapSquareToCircle(x, z) {
  const u = x * Math.sqrt(1 - (z * z) / 2);
  const v = z * Math.sqrt(1 - (x * x) / 2);
  return { x: u, z: v };
}

function getMandelbrotVal(x, z, zoom = 0.05, offsetX = -0.7, offsetZ = 0.0) {
  let cx = x * zoom + offsetX;
  let cy = z * zoom + offsetZ;
  let zx = 0,
    zy = 0,
    i = 0;
  const maxIter = 50;
  while (zx * zx + zy * zy < 4 && i < maxIter) {
    let tmp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = tmp;
    i++;
  }
  return i / maxIter;
}

function smoothStep(min, max, value) {
  var x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function generateGround() {
  const size = 40;
  const height = 25;
  const segments = 120; // Un peu plus de segments pour un rendu plus fluide

  const geometry = new THREE.BoxGeometry(
    size,
    height,
    size,
    segments,
    30, // Segments verticaux augmentés pour les stalactites
    segments
  );
  geometry.translate(0, -height / 2, 0);

  // Initialisation du bruit Simplex
  const noise2D = createNoise2D();
  const noise3D = createNoise3D();

  const pos = geometry.attributes.position;
  const colors = [];
  const v = new THREE.Vector3();

  const cDeepest = new THREE.Color("#004d40");
  const cForest = new THREE.Color("#2e7d32");
  const cLush = new THREE.Color("#45851d");
  const cLime = new THREE.Color("#367801");

  const cRockDark = new THREE.Color("#1a1f1a");
  const cRockLight = new THREE.Color("#4a5d50");
  const cMoss = new THREE.Color("#33691e");

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const nx = v.x / (size / 2);
    const nz = v.z / (size / 2);
    const circle = mapSquareToCircle(nx, nz);
    v.x = circle.x * (size / 2);
    v.z = circle.z * (size / 2);

    // Contour déchiqueté
    const dist = Math.sqrt(v.x * v.x + v.z * v.z);
    const edgeFactor = Math.max(0, dist / (size / 2) - 0.3);
    if (edgeFactor > 0) {
      const bigShape = noise2D(nx * 1.5, nz * 1.5) * 2.0;
      const jaggedEdges = noise2D(nx * 4.0, nz * 4.0) * 0.5;
      const totalDistortion = (bigShape + jaggedEdges) * edgeFactor;
      v.x += totalDistortion;
      v.z += totalDistortion;
    }

    const normalizedHeight = Math.abs(v.y) / height;

    // Sol (HAUT)
    if (v.y > -1.5) {
      v.y = 0;

      const warpScale = 0.03;
      const warpStrength = 8.0;

      const dx = noise2D(v.x * warpScale, v.z * warpScale);
      const dz = noise2D(v.x * warpScale + 100, v.z * warpScale);
      const warpedX = v.x + dx * warpStrength;
      const warpedZ = v.z + dz * warpStrength;

      const m1 = getMandelbrotVal(warpedX, warpedZ, 0.04, -0.5, 0.0);
      const m2 = getMandelbrotVal(warpedX + dx * 2, warpedZ + dz * 2, 0.08, -0.2, 0.3);
      const grain = noise2D(v.x * 0.8, v.z * 0.8);

      const val = m1 * 0.6 + m2 * 0.4 + grain * 0.05;

      let c = new THREE.Color();
      if (val < 0.3) {
        c.copy(cDeepest).lerp(cForest, smoothStep(0.0, 0.2, val));
      } else if (val < 0.6) {
        c.copy(cForest).lerp(cLush, smoothStep(0.3, 0.6, val));
      } else {
        c.copy(cLush).lerp(cLime, smoothStep(0.3, 0.7, val));
      }

      v.x *= 1.05;
      v.z *= 1.05;
      colors.push(c.r, c.g, c.b);
    } 
    // Rochers et stalactites (BAS)
    else {
      let taper = Math.max(0, 1 - Math.pow(normalizedHeight, 0.8) * 1.3);

      const structNoise = noise3D(v.x * 0.06, v.y * 0.06, v.z * 0.06) * 6;
      const strata = Math.sin(v.y * 1.5 + structNoise * 0.5) * 1.5;

      const stalactiteNoise = noise2D(v.x * 0.2, v.z * 0.2);
      const stalactite = Math.pow(Math.max(0, stalactiteNoise), 5) * 15;

      v.x += structNoise + strata;
      v.z += structNoise + strata;

      if (stalactite > 0.5 && normalizedHeight > 0.25) {
        v.y -= stalactite;
        taper *= 0.6;
      }

      v.x *= taper;
      v.z *= taper;

      const relief = structNoise + strata;
      let rockColor = cRockLight.clone().lerp(cRockDark, normalizedHeight * 1.2);

      if (relief < -2) rockColor.lerp(cRockDark, 0.8);

      // Transition de mousse qui coule du haut
      if (normalizedHeight < 0.35) {
        const mossMask = smoothStep(0.35, 0.0, normalizedHeight + stalactiteNoise * 0.1);
        rockColor.lerp(cMoss, mossMask * 0.8);
      }

      colors.push(rockColor.r, rockColor.g, rockColor.b);
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geometry.computeVertexNormals();
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  return geometry;
}

export function Ground() {
  const geom = useMemo(() => generateGround(), []);

  return (
    <group>
      <mesh geometry={geom} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={1}
          metalness={0.0}
          flatShading={false}
        />
      </mesh>
    </group>
  );
}