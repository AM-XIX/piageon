import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Scene({ isRunning, speed, gridSize = 10 }) {
  const mountRef = useRef(null);
  const intervalRef = useRef(null);
  const nextGenRef = useRef(null);
  const cameraRef = useRef(null);
  const gridRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = "";

    const scene = new THREE.Scene();

    // Colors
    const deadColor = 0xefd5ff;
    const aliveColor = 0x515ada;
    scene.background = new THREE.Color(deadColor);

    // Aspect ratio
    const aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
    const fov = 75;
    const spacing = 3;

    // Camera
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.up.set(0, 0, -1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);


    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xefd5ff, 0.3, 50);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Grid setup
    const cellSize = 2;
    const cubes = [];
    gridRef.current = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(0)
    );

    function updateCameraPosition(size) {
      const distance = size * spacing * 0.7;
      camera.position.set(0, distance, 0);
      camera.lookAt(0, 0, 0);
    }
    updateCameraPosition(gridSize);

    const offset = ((gridSize - 1) / 2) * spacing;

    // Création des cubes
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        const material = new THREE.MeshStandardMaterial({
          color: deadColor,
          emissive: deadColor,
          emissiveIntensity: 0.6,
          roughness: 0.3,
          metalness: 0.5,
        });

        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(i * spacing - offset, 0, j * spacing - offset);

        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.2,
            transparent: true,
          })
        );
        cube.add(line);

        scene.add(cube);
        cubes.push(cube);
      }
    }

    // Mise à jour couleur cube
    function updateCubeColor(i, j) {
      const cube = cubes[i * gridSize + j];
      if (gridRef.current[i][j] === 1) {
        cube.material.emissive.setHex(aliveColor);
        cube.material.color.setHex(aliveColor);
        cube.material.emissiveIntensity = 1 + Math.random() * 0.3;
      } else {
        cube.material.emissive.setHex(deadColor);
        cube.material.color.setHex(deadColor);
        cube.material.emissiveIntensity = 0.6 + Math.random() * 0.2;
      }
    }

    // Next Generation Logic : check neighbors and update grid
    function nextGeneration() {
      const oldGrid = gridRef.current;
      const newGrid = oldGrid.map((row) => [...row]);

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          let neighbors = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              if (di === 0 && dj === 0) continue;
              const ni = (i + di + gridSize) % gridSize;
              const nj = (j + dj + gridSize) % gridSize;
              neighbors += oldGrid[ni][nj];
            }
          }

          newGrid[i][j] =
            oldGrid[i][j] === 1
              ? neighbors === 2 || neighbors === 3
                ? 1
                : 0
              : neighbors === 3
              ? 1
              : 0;
        }
      }

      gridRef.current = newGrid;
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

      // Raycasting to find intersected cubes
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cubes, false);

      if (intersects.length > 0) { // If a cube is clicked
        const cube = intersects[0].object;
        const index = cubes.indexOf(cube);
        const i = Math.floor(index / gridSize);
        const j = index % gridSize;
        gridRef.current[i][j] = gridRef.current[i][j] ? 0 : 1; // Update grid state
        updateCubeColor(i, j);
      }
    }
    renderer.domElement.addEventListener("click", onClick);

    function animate() { // Animation loop
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Clear
    function clearHandler() {
      gridRef.current = Array.from({ length: gridSize }, () =>
        Array(gridSize).fill(0)
      );
      for (let i = 0; i < gridSize; i++)
        for (let j = 0; j < gridSize; j++) updateCubeColor(i, j);
    }
    window.addEventListener("clearGrid", clearHandler);

    // Cleanup on unmount
    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("clearGrid", clearHandler);
      clearInterval(intervalRef.current);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [gridSize]);


  // Handle isRunning and speed changes
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isRunning && nextGenRef.current) {
      const intervalSpeed = 2000 - speed + 50;
      intervalRef.current = setInterval(() => {
        nextGenRef.current();
      }, intervalSpeed);
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
