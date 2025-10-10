// main.js (module)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* -------------------- setup scène / renderer / camera -------------------- */
const container = document.getElementById('canvas-holder');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f5f7);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(30, 30, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

/* lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

/* -------------------- UI elements -------------------- */
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const stepBtn = document.getElementById('step');
const randomBtn = document.getElementById('random');
const clearBtn = document.getElementById('clear');

const sizeInput = document.getElementById('size');
const densityInput = document.getElementById('density');
const speedInput = document.getElementById('speed');
const speedVal = document.getElementById('speed-val');

/* -------------------- simulation state -------------------- */
let size = Math.max(8, Math.min(256, parseInt(sizeInput.value, 10) || 32)); // grid width/height
let density = Math.max(0, Math.min(100, parseInt(densityInput.value, 10) || 30));
let speed = Math.max(1, Math.min(60, parseInt(speedInput.value, 10) || 6)); // steps/sec

let cells = null;       // Uint8Array current
let nextCells = null;   // Uint8Array next generation

/* Instanced mesh + helpers */
let instMesh = null;
const dummy = new THREE.Object3D();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const aliveColor = new THREE.Color(0x2196f3);
const deadColor = new THREE.Color(0x111111);

/* running state */
let running = false;
let lastStepTime = 0;

/* -------------------- helpers: create / dispose grid -------------------- */
function createGrid(newSize) {
  // clear old mesh
  if (instMesh) {
    instMesh.geometry.dispose();
    instMesh.material.dispose();
    scene.remove(instMesh);
    instMesh = null;
  }

  size = newSize;
  const count = size * size;

  // geometry slightly smaller than 1 to show separation
  const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });

  instMesh = new THREE.InstancedMesh(geometry, material, count);
  instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // per-instance color attribute (r,g,b floats)
  instMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  scene.add(instMesh);

  // allocate arrays
  cells = new Uint8Array(count);
  nextCells = new Uint8Array(count);

  // position instances in a grid (x,z) with origin centered
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = x + y * size;
      dummy.position.set(x - half + 0.5, 0.5, y - half + 0.5);
      // initially invisible (tiny) — we'll set the visible ones in update
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
      instMesh.instanceColor.setXYZ(i, deadColor.r, deadColor.g, deadColor.b);
    }
  }
  instMesh.instanceMatrix.needsUpdate = true;
  instMesh.instanceColor.needsUpdate = true;

  // place camera to keep grid in view
  camera.position.set(size * 0.9, Math.max(20, size), size * 0.9);
  controls.update();
}

/* Apply the cells array to the instanced mesh (draw all instances) */
function updateMeshFromCells() {
  const half = size / 2;
  for (let i = 0; i < cells.length; i++) {
    const alive = cells[i] === 1;
    const x = i % size;
    const y = Math.floor(i / size);

    // position is constant; we only change scale (visible/hidden) and color
    dummy.position.set(x - half + 0.5, 0.5, y - half + 0.5);

    if (alive) {
      dummy.scale.set(1, 1, 1);
      instMesh.instanceColor.setXYZ(i, aliveColor.r, aliveColor.g, aliveColor.b);
    } else {
      // shrink to near-zero to hide (fast and works with InstancedMesh)
      dummy.scale.set(0.001, 0.001, 0.001);
      instMesh.instanceColor.setXYZ(i, deadColor.r, deadColor.g, deadColor.b);
    }
    dummy.updateMatrix();
    instMesh.setMatrixAt(i, dummy.matrix);
  }
  instMesh.instanceMatrix.needsUpdate = true;
  instMesh.instanceColor.needsUpdate = true;
}

/* Update only one instance (used for click toggle to avoid full reupload) */
function updateInstance(i) {
  const alive = cells[i] === 1;
  const x = i % size;
  const y = Math.floor(i / size);
  const half = size / 2;

  dummy.position.set(x - half + 0.5, 0.5, y - half + 0.5);
  if (alive) {
    dummy.scale.set(1, 1, 1);
    instMesh.instanceColor.setXYZ(i, aliveColor.r, aliveColor.g, aliveColor.b);
  } else {
    dummy.scale.set(0.001, 0.001, 0.001);
    instMesh.instanceColor.setXYZ(i, deadColor.r, deadColor.g, deadColor.b);
  }
  dummy.updateMatrix();
  instMesh.setMatrixAt(i, dummy.matrix);
  instMesh.instanceMatrix.needsUpdate = true;
  instMesh.instanceColor.needsUpdate = true;
}

/* -------------------- Game of Life logic -------------------- */
/* Standard Conway rules, toroidal wrap (edges wrap-around). Wrap chosen for simplicity and to avoid boundary "evaporation". */
function stepGeneration() {
  const s = size;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = x + y * s;
      let n = 0;
      // 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        const ny = (y + dy + s) % s;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = (x + dx + s) % s;
          if (dx === 0 && dy === 0) continue;
          n += cells[nx + ny * s];
        }
      }
      const alive = cells[i] === 1;
      nextCells[i] = (alive ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
    }
  }

  // swap buffers
  const tmp = cells;
  cells = nextCells;
  nextCells = tmp;

  // update visual
  updateMeshFromCells();
}

/* -------------------- UI callbacks -------------------- */
function randomizeGrid() {
  const p = density / 100;
  for (let i = 0; i < cells.length; i++) {
    cells[i] = Math.random() < p ? 1 : 0;
  }
  updateMeshFromCells();
}

function clearGrid() {
  cells.fill(0);
  updateMeshFromCells();
}

/* click-to-toggle */
function onPointerDown(e) {
  // compute normalized device coords
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(instMesh);
  if (hits.length > 0) {
    const hit = hits[0];
    // instanceId provided by Raycaster for InstancedMesh
    const id = hit.instanceId;
    if (id !== undefined && id !== null) {
      cells[id] = cells[id] ? 0 : 1;
      updateInstance(id);
    }
  }
}

/* -------------------- animation / stepping -------------------- */
function animate(time) {
  requestAnimationFrame(animate);
  controls.update();

  // time is in ms
  if (running) {
    const interval = 1000 / speed;
    if (time - lastStepTime >= interval) {
      // allow multiple steps if lagging
      while (time - lastStepTime >= interval) {
        stepGeneration();
        lastStepTime += interval;
      }
    }
  } else {
    // keep lastStepTime fresh when stopped so we don't instantly fire many steps when resumed
    lastStepTime = time;
  }

  renderer.render(scene, camera);
}

/* -------------------- events wiring -------------------- */
renderer.domElement.addEventListener('pointerdown', onPointerDown);

startBtn.addEventListener('click', () => {
  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  lastStepTime = performance.now();
});

stopBtn.addEventListener('click', () => {
  running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

stepBtn.addEventListener('click', () => {
  // single step even if running=false
  stepGeneration();
});

randomBtn.addEventListener('click', randomizeGrid);
clearBtn.addEventListener('click', clearGrid);

sizeInput.addEventListener('change', () => {
  const newSize = Math.max(8, Math.min(256, parseInt(sizeInput.value, 10) || 32));
  createGrid(newSize);
  // re-seed after resizing: keep old density setting
  randomizeGrid();
});

densityInput.addEventListener('change', () => {
  density = Math.max(0, Math.min(100, parseInt(densityInput.value, 10) || 30));
});

speedInput.addEventListener('input', (e) => {
  speed = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 6));
  speedVal.textContent = speed;
});

/* resize handling */
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

/* -------------------- init -------------------- */
createGrid(size);
randomizeGrid();
animate(performance.now());
