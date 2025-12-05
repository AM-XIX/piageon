"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Noise } from "noisejs";

function generateSmallFloatingIsland(radius = 60, depth = 35, segments = 100) {
  const noise = new Noise(Math.random());

  function mandelbrotHeight(x, y, maxIter = 100) {
    let a = x;
    let b = y;
    const ca = a;
    const cb = b;
    let n = 0;
    for (; n < maxIter; n++) {
      const aa = a * a - b * b;
      const bb = 2 * a * b;
      a = aa + ca;
      b = bb + cb;
      if (a * a + b * b > 16) break;
    }
    return n / maxIter;
  }

  const geometry = new THREE.BoxGeometry(
    radius * 2,
    depth,
    radius * 2,
    segments,
    20,
    segments
  );

  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  const colors = [];

  const topY = depth / 2;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const distFromCenter = Math.sqrt(v.x * v.x + v.z * v.z);
    const distRatio = distFromCenter / radius;

    const isOutsideCircle = distFromCenter > radius;

    if (isOutsideCircle) {
      v.y -= (distFromCenter - radius) * 2 + 5;
      const angle = Math.atan2(v.z, v.x);
      v.x = Math.cos(angle) * radius;
      v.z = Math.sin(angle) * radius;
    }

    const nx = v.x * 0.05;
    const nz = v.z * 0.05;

    // Surface supérieure plane
    if (v.y > topY - 2 && !isOutsideCircle) {
      let h = mandelbrotHeight(nx * 1.5 - 0.5, nz * 1.5) * 2;
      h += noise.simplex2(nx * 2, nz * 2) * 0.5;

      if (distRatio > 0.8) h *= (1 - distRatio) * 5;

      v.y += h;

      const c = new THREE.Color();
      if (h < 1) c.setHex(0x3a5f3a);
      else if (h < 2) c.setHex(0x6b8e23);
      else c.setHex(0x8b7765);

      c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.02);
      colors.push(c.r, c.g, c.b);
    } 
    // Partie inférieure
    else {
      const relativeY = (v.y + depth / 2) / depth;
      const taper = Math.max(0, relativeY);

      if (v.y < topY - 5) {
        v.x *= Math.pow(taper, 0.5);
        v.z *= Math.pow(taper, 0.5);
      }

      const bulge = noise.simplex3(nx, v.y * 0.1, nz) * 6;
      const angle = Math.atan2(v.z, v.x);
      v.x += Math.cos(angle) * bulge;
      v.z += Math.sin(angle) * bulge;

      // Stalactites
      let hang = 0;
      if (v.y < -depth / 4) {
        const caveNoise = noise.simplex2(nx * 1.5, nz * 1.5);
        hang = Math.abs(caveNoise) * 15 * (1 - distRatio);
        v.y -= hang;
      }

      const c = new THREE.Color();
      const depthFactor = (v.y + depth) / depth;
      c.setHex(0x5C4033);
      c.lerp(new THREE.Color(0x1a1a1a), 1 - depthFactor);
      colors.push(c.r, c.g, c.b);
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

export default function FloatingIsland() {
  const geom = useMemo(
    () => generateSmallFloatingIsland(60, 35, 120),
    []
  );

  return (
    <mesh geometry={geom} castShadow receiveShadow position={[0, 0, 0]}>
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}
