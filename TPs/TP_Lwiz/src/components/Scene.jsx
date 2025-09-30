import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Scene({ isRunning, speed, gridSize = 10 }) {
  const mountRef = useRef(null);
  const intervalRef = useRef(null);
  const nextGenRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    const aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
    const fov = 75;
    const spacing = 3;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.up.set(0, 0, -1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x210049, 0.5);
    scene.add(ambientLight);

    const cellSize = 2;
    const cubes = [];
    let grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

    function updateCameraPosition(size) {
      const offset = ((size - 1) / 2) * spacing;
      const distance = size * spacing * 0.7;
      camera.position.set(0, distance, 0);
      camera.lookAt(0, 0, 0);
    }
    updateCameraPosition(gridSize);

    const offset = ((gridSize - 1) / 2) * spacing;
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

    function updateCubeColor(i, j) {
      const cube = cubes[i * gridSize + j];
      if (grid[i][j] === 1) {
        cube.material.emissive.setHex(0xed244e);
        cube.material.color.setHex(0xed244e);
      } else {
        cube.material.emissive.setHex(0x210049);
        cube.material.color.setHex(0x210049);
      }
    }

    function nextGeneration() {
      const newGrid = grid.map(arr => [...arr]);
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          let neighbors = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              if (di === 0 && dj === 0) continue;
              const ni = i + di;
              const nj = j + dj;
              if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize) {
                neighbors += grid[ni][nj];
              }
            }
          }
          newGrid[i][j] =
            grid[i][j] === 1
              ? neighbors === 2 || neighbors === 3
                ? 1
                : 0
              : neighbors === 3
              ? 1
              : 0;
        }
      }
      grid = newGrid;
      for (let i = 0; i < gridSize; i++)
        for (let j = 0; j < gridSize; j++) updateCubeColor(i, j);
    }

    nextGenRef.current = nextGeneration;

    // Click toggle
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
        const index = cubes.indexOf(cube);
        const i = Math.floor(index / gridSize);
        const j = index % gridSize;
        grid[i][j] = grid[i][j] === 0 ? 1 : 0;
        updateCubeColor(i, j);
      }
    }
    renderer.domElement.addEventListener("click", onClick);

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Clear
    function clearHandler() {
      grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
      for (let i = 0; i < gridSize; i++)
        for (let j = 0; j < gridSize; j++) updateCubeColor(i, j);
    }
    window.addEventListener("clearGrid", clearHandler);

    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("clearGrid", clearHandler);
      clearInterval(intervalRef.current);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [gridSize]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isRunning && nextGenRef.current) {
      intervalRef.current = setInterval(() => {
        nextGenRef.current();
      }, speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, speed]);

  return (
    <div
      className="stage"
      ref={mountRef}
      style={{ width: "600px", height: "600px" }}
    />
  );
}
