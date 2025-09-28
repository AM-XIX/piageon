import "./App.css";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xff00ff, 0.2); // lumière diffuse violette
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.8); // lumière principale cyan
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const gridSize = 10;
    const cellSize = 1;
    const spacing = 1.5;
    const cubes = [];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        const material = new THREE.MeshStandardMaterial({
          color: 0x00ffcc,
          emissive: 0x00ffcc,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.7,
        });
        const cube = new THREE.Mesh(geometry, material);

        cube.position.set(
          (i - gridSize / 2) * spacing,
          0,
          (j - gridSize / 2) * spacing
        );

        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x003333 })
        );
        cube.add(line);

        scene.add(cube);
        cubes.push(cube);
      }
    }

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
        if (cube.material.emissive.getHex() === 0x00ffcc) {
          cube.material.emissive.setHex(0xff00ff);
          cube.material.color.setHex(0xff00ff);
        } else {
          cube.material.emissive.setHex(0x00ffcc);
          cube.material.color.setHex(0x00ffcc);
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
    <div className="layout">
      <div
        className="stage"
        ref={mountRef}
        style={{ width: "600px", height: "600px" }}
      />
      <div className="panel" style={{ color: "#00ffcc" }}>
        <button id="startStopBtn">Start/Stop</button>
        <button id="clearBtn">Clear</button>
        <br />
        <label htmlFor="speedRange">Speed:</label>
        <input
          type="range"
          id="speedRange"
          min="100"
          max="2000"
          step="100"
          defaultValue="1000"
        />
        <br />
        <label htmlFor="sizeSelect">Grid Size:</label>
        <select id="sizeSelect">
          <option value="20">20x20</option>
          <option value="50">50x50</option>
          <option value="100">100x100</option>
        </select>
      </div>
    </div>
  );
}
