import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./GameOfLife.css";

// === Génération fractale Mandelbrot pour le terrain ===
function generateMandelbrotHeightMap(size, scale = 0.01, maxIter = 50) {
  const heightMap = [];
  for (let x = 0; x < size; x++) {
    heightMap[x] = [];
    for (let y = 0; y < size; y++) {
      const a0 = (x - size / 2) * scale;
      const b0 = (y - size / 2) * scale;
      let a = a0;
      let b = b0;
      let n = 0;

      while (a * a + b * b <= 4 && n < maxIter) {
        const tempA = a * a - b * b + a0;
        b = 2 * a * b + b0;
        a = tempA;
        n++;
      }

      const height = n === maxIter ? 0 : n / maxIter;
      heightMap[x][y] = height;
    }
  }
  return heightMap;
}

export default function Scene({ isRunning, speed, gridSize = 10 }) {
  const mountRef = useRef(null);
  const intervalRef = useRef(null);
  const nextGenRef = useRef(null);
  const gridRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = "";

    // === Scene / Renderer / Camera ===
    const scene = new THREE.Scene();
    const deadColor = 0xefd5ff;
    const aliveColor = 0x515ada;
    scene.background = new THREE.Color(0x332244);

    const aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    camera.position.set(gridSize * 2, gridSize * 2, gridSize * 2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // === Lumières ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const pointLight = new THREE.PointLight(0xffffff, 1, 200);
    pointLight.position.set(gridSize * 2, gridSize * 2, gridSize * 2);
    scene.add(ambientLight, pointLight);

    // === Terrain fractal ===
    const terrainGeom = new THREE.PlaneGeometry(gridSize * 3, gridSize * 3, gridSize - 1, gridSize - 1);
    terrainGeom.rotateX(-Math.PI / 2);
    const heightMap = generateMandelbrotHeightMap(gridSize - 1, 0.015);

    for (let i = 0; i < terrainGeom.attributes.position.count; i++) {
      const x = i % gridSize;
      const y = Math.floor(i / gridSize);
      const z = heightMap[x % (gridSize - 1)][y % (gridSize - 1)] * 8;
      terrainGeom.attributes.position.setY(i, z);
    }
    terrainGeom.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x7766aa,
      flatShading: true,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const terrain = new THREE.Mesh(terrainGeom, terrainMat);
    terrain.position.y = -2;
    scene.add(terrain);

    // === Grille cubes (Jeu de la vie) ===
    const cellSize = 2;
    const spacing = 3;
    const offset = ((gridSize - 1) / 2) * spacing;
    const cubes = [];
    gridRef.current = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const cubeGeom = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        const cubeMat = new THREE.MeshStandardMaterial({
          color: deadColor,
          emissive: deadColor,
          emissiveIntensity: 0.6,
          roughness: 0.5,
          metalness: 0.3,
        });

        const cube = new THREE.Mesh(cubeGeom, cubeMat);

        // Placer cube au-dessus du terrain
        const terrainIndex = i * gridSize + j;
        const terrainHeight = terrainGeom.attributes.position.getY(terrainIndex) || 0;
        cube.position.set(
          i * spacing - offset,
          terrainHeight + cellSize / 2,
          j * spacing - offset
        );

        // Fil de cube
        const edges = new THREE.EdgesGeometry(cubeGeom);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true })
        );
        cube.add(line);

        scene.add(cube);
        cubes.push(cube);
      }
    }

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

    // === Automate cellulaire ===
    function nextGeneration() {
      const oldGrid = gridRef.current;
      const newGrid = oldGrid.map(r => [...r]);
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
          newGrid[i][j] = oldGrid[i][j] === 1 ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : neighbors === 3 ? 1 : 0;
        }
      }
      gridRef.current = newGrid;
      for (let i = 0; i < gridSize; i++) for (let j = 0; j < gridSize; j++) updateCubeColor(i, j);
    }
    nextGenRef.current = nextGeneration;

    // === Interaction clic ===
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
        gridRef.current[i][j] = gridRef.current[i][j] ? 0 : 1;
        updateCubeColor(i, j);
      }
    }
    renderer.domElement.addEventListener("click", onClick);

    // === Animation loop ===
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // === Cleanup ===
    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      clearInterval(intervalRef.current);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [gridSize]);

  // === Gestion cycle de vie ===
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isRunning && nextGenRef.current) {
      const intervalSpeed = 2000 - speed + 50;
      intervalRef.current = setInterval(() => nextGenRef.current(), intervalSpeed);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, speed]);

  return <div ref={mountRef} style={{ width: "600px", height: "600px" }} />;
}
