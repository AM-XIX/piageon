import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Noise } from "noisejs";

// Terrain generation with double Mandelbrot sets
function generateDoubleMandelbrotIsland(size = 600, segments = 512) {
  const noise = new Noise(Math.random());

  function mandelbrotHeight(
    x,
    y,
    zoom = 2.5,
    offsetX = -0.5,
    offsetY = 0,
    maxIter = 120
  ) {
    let a = x / zoom + offsetX;
    let b = y / zoom + offsetY;
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

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const radius = size / 2;
  const colors = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z) / radius;

    const mask = dist <= 1 ? Math.pow(1 - dist, 2.8) : 0;

    // Mandelbrot base
    let h1 = mandelbrotHeight(x * 0.015, z * 0.015) * 0.5;
    h1 += mandelbrotHeight(x * 0.03 + 10, z * 0.03 - 5) * 0.3;

    let h2 =
      mandelbrotHeight((x + 15) * 0.02, (z - 12) * 0.02, 2.0, -0.4, 0.1) * 0.4;
    h2 +=
      mandelbrotHeight((x - 8) * 0.025, (z + 5) * 0.025, 3.0, -0.3, 0.2) * 0.25;

    // Noise details
    const n1 =
      0.4 * noise.simplex2(x * 0.01, z * 0.01) +
      0.2 * noise.simplex2(x * 0.04, z * 0.04) +
      0.1 * noise.simplex2(x * 0.1, z * 0.1);

      // Final height calculation
    let h = (h1 + h2) * 12 * mask;
    h += n1 * 8 * mask;
    h *= 0.9 + 0.2 * Math.sin(dist * Math.PI);
    h += Math.random() * 0.3;

    pos.setY(i, h);

    // Height based coloring
    const color = new THREE.Color();
    if (h < 1.5) color.setHex(0x223344);
    else if (h < 3) color.setHex(0x3a5f3a);
    else if (h < 5.5) color.setHex(0x6b8e23);
    else if (h < 8) color.setHex(0x8b7765);
    else color.setHex(0xe0e0e0);

    color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.normalizeNormals();

  return geometry;
}

// Rendering component for the Mandelbrot terrain
export default function MandelbrotTerrain({ width = 400, height = 300 }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    if (rendererRef.current) {
      mountRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0a, 200, 800);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 200, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 
    const geometry = generateDoubleMandelbrotIsland(600, 512);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0.1,
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Water plane around the island
    const waterGeom = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1e3f66,
      transparent: true,
      opacity: 0.7,
      roughness: 0.8,
      metalness: 0.3,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);

    // Lights
    const sun = new THREE.DirectionalLight(0xfff4cc, 1.3);
    sun.position.set(200, 300, 200);
    sun.castShadow = true;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x223366, 0.3);
    fillLight.position.set(-200, 100, -200);
    scene.add(fillLight);

    scene.add(new THREE.AmbientLight(0x202020));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 10, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1200;
    controls.minDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    let running = true;
    const animate = () => {
      if (!running) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      running = false;
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      waterGeom.dispose();
      waterMat.dispose();
      sun.dispose?.();
      fillLight.dispose?.();
      controls.dispose();
      if (
        mountRef.current &&
        renderer.domElement.parentNode === mountRef.current
      ) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  return (
    <div
      ref={mountRef}
      style={{
        display: "block",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    />
  );
}