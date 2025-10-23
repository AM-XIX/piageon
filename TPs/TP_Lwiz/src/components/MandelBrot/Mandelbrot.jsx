import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function generateDoubleMandelbrotIsland(size = 200, segments = 256) {
  // Height function based on Mandelbrot set
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
    let ca = a;
    let cb = b;
    let n = 0;
    for (; n < maxIter; n++) {
      // Mandelbrot iteration loop
      const aa = a * a - b * b;
      const bb = 2 * a * b;
      a = aa + ca;
      b = bb + cb;
      if (a * a + b * b > 16) break;
    }
    return n / maxIter; // normalize height
  }

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const radius = size / 2;
  const colors = [];

  // Generate terrain heights and colors
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z) / radius;

    const mask = dist <= 1 ? Math.max(0, 1 - dist * dist) : 0;

    // combine multiple Mandelbrot-based height layers
    // first mandelbrot island
    let h1 = mandelbrotHeight(x * 0.03, z * 0.03) * 0.5;
    h1 += mandelbrotHeight(x * 0.06 + 10, z * 0.06 - 5) * 0.3;
    // second mandelbrot island
    let h2 =
      mandelbrotHeight((x + 15) * 0.04, (z - 12) * 0.04, 2.0, -0.4, 0.1) * 0.4;
    h2 +=
      mandelbrotHeight((x - 8) * 0.05, (z + 5) * 0.05, 3.0, -0.3, 0.2) * 0.25;

    // Final height calculation
    let h = Math.pow(h1 + h2, 0.9) * 8 * mask;
    h += Math.random() * 0.8; // Noise for realism
    pos.setY(i, h);

    // color based on height
    const color = new THREE.Color();
    if (h < 1.5) color.setHex(0x331a0f);
    else if (h < 4) color.setHex(0x553322);
    else if (h < 7) color.setHex(0x887766);
    else if (h < 9) color.setHex(0xbb9988);
    else color.setHex(0xddd0b0);

    color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

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

    // fog for depth effect
    scene.fog = new THREE.Fog(0x0a0a0a, 60, 500);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 80, 150);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // terrain generation
    const geometry = generateDoubleMandelbrotIsland(200, 256);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0.2,
    });
    const terrain = new THREE.Mesh(geometry, material);
    scene.add(terrain);

    // lights
    const dirLight = new THREE.DirectionalLight(0xfff0c8, 1.2);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x222244, 0.3);
    fillLight.position.set(-50, 20, -50);
    scene.add(fillLight);

    scene.add(new THREE.AmbientLight(0x101010));

    // controls for orbiting around
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 400;
    controls.minDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;

    let running = true;
    const animate = () => {
      if (!running) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      // Cleanup on unmount
      running = false;
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      dirLight.dispose?.();
      fillLight.dispose?.();
      controls.dispose();
      if ( // if mountRef and renderer DOM element exist
        mountRef.current &&
        renderer.domElement.parentNode === mountRef.current
      ) { // remove renderer DOM element
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
