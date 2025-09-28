import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Scene() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = "";

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 30, 0);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x210049, 0.5);
    scene.add(ambientLight);

    // Grid
    const gridSize = 10;
    const cellSize = 2;
    const spacing = 3;
    const cubes = [];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        const material = new THREE.MeshStandardMaterial({
          color: 0x210049,
          emissive: 0x210049,
          emissiveIntensity: 1.0,
          roughness: 0.2,
          metalness: 0.7,
        });

        const cube = new THREE.Mesh(geometry, material);
        const offset = ((gridSize - 1) / 2) * spacing;

        cube.position.set(i * spacing - offset, 0, j * spacing - offset);

        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0xaaaaaa })
        );
        cube.add(line);

        scene.add(cube);
        cubes.push(cube);
      }
    }

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cubes, false);

      if (intersects.length > 0) {
        const cube = intersects[0].object;
        if (cube.material.emissive.getHex() === 0x210049) {
          cube.material.emissive.setHex(0xed244e);
          cube.material.color.setHex(0xed244e);
        } else {
          cube.material.emissive.setHex(0x210049);
          cube.material.color.setHex(0x210049);
        }
      }
    }

    renderer.domElement.addEventListener("click", onClick);

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div
      className="stage"
      ref={mountRef}
      style={{ width: "600px", height: "600px" }}
    />
  );
}
