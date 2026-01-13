// main.js — version simple avec cubes individuels

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* -------------------- setup scène / renderer / camera -------------------- */
const container = document.getElementById('canvas-holder');
if (!container) throw new Error('Element #canvas-holder introuvable');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f5f7);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(30, 30, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// lights
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
let size = parseInt(sizeInput?.value || '32', 10);
let density = parseInt(densityInput?.value || '30', 10);
let speed = parseInt(speedInput?.value || '6', 10);

let cells = [];
let age = [];
let nextCells = [];
let nextAge = [];

let cubes = []; // tableau des meshes
let running = false;
let lastStepTime = 0;

/* -------------------- couleurs -------------------- */
const COLORS = {
  0: new THREE.Color(0x000000), // vide
  1: new THREE.Color(0xf44336), // C rouge  
  2: new THREE.Color(0x4caf50), // F vert
  3: new THREE.Color(0xffeb3b), // M jaune 
  4: new THREE.Color(0x2196f3), // D bleu 
  5: new THREE.Color(0x9e9e9e), // N neutre
  6: new THREE.Color(0x9c27b0), // A violet
};

/* -------------------- GRID CREATION -------------------- */
function createGrid(newSize) {
  // supprimer les cubes existants
  cubes.forEach(c => scene.remove(c));
  cubes = [];
  cells = new Array(newSize*newSize).fill(0);
  nextCells = new Array(newSize*newSize).fill(0);
  age = new Array(newSize*newSize).fill(0);
  nextAge = new Array(newSize*newSize).fill(0);

  size = newSize;
  const half = size / 2;

  const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = x + y * size;
      const material = new THREE.MeshStandardMaterial({ color: COLORS[0] });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(x - half + 0.5, 0.5, y - half + 0.5);
      scene.add(cube);
      cubes.push(cube);
    }
  }

  camera.position.set(size * 0.9, Math.max(20, size), size * 0.9);
  controls.update();
}

/* -------------------- UPDATE -------------------- */
function updateInstance(i) {
  const type = cells[i];
  const cube = cubes[i];
  cube.scale.set(type===0?0.001:1, type===0?0.001:1, type===0?0.001:1);
  cube.material.color.copy(COLORS[type]);
}

/* -------------------- UPDATE MESH -------------------- */
function updateMeshFromCells() {
  for (let i=0; i<cells.length; i++) updateInstance(i);
}

/* -------------------- RULES ENGINE -------------------- */
function stepGeneration() {
  const s = size;
  nextCells.fill(0);
  nextAge.fill(0);

  for (let y=0;y<s;y++){
    for (let x=0;x<s;x++){
      const i = x + y*s;
      const type = cells[i];
      const count = [0,0,0,0,0,0,0];

      for (let dy=-1;dy<=1;dy++){
        const ny=(y+dy+s)%s;
        for (let dx=-1;dx<=1;dx++){
          if(dx===0&&dy===0) continue;
          const nx=(x+dx+s)%s;
          count[cells[nx+ny*s]]++;
        }
      }

      let newType = type;
      let newAge = age[i]+1;

      if(type!==0){
        if(type===5 && age[i]>=10) newType=0;
        if(age[i]>=15) newType=0;
      }

      // règles simplifiées pour chaque type
      if(newType!==0){
        switch (type) {

  case 1: // C
    if (count[3] > 1) newType = 0;               // M tue C
    else if (count[2] >= 2) newType = 0;         // F affaiblit C
    else if (count[1] >= 2) newType = 1; // survie style GoL
    else if (count[1] > 4) newType = 0;
    break;

  case 2: // F
    if (count[4] > 1) newType = 0;               // D tue F
    else if (count[2] !== 2 && count[2] !== 3) newType = 0;
    break;

  case 3: // M
    if (count[1] >= 1) newType = 0;              // C contrôle M
    else if (count[2] >= 2) newType = 3;        // F renforce M
    else if (count[3] >= 3) newType = 0;        // M concurrence interne
    break;

  case 4: // D
    if (count[2] >= 2) newType = 0;              // F tue D
    else if (count[4] >= 2) newType = 4;       // D se maintient en groupe
    break;

  case 5: // N
    // seulement vieillesse gérée plus haut
    break;

  case 6: // A (rare et stable)
    if (count[3] >= 3) newType = 0;              // M tue A
    else if (count[6] !== 1 && count[6] !== 2) newType = 0; // survit en petit groupe
    break;
}
      }

      nextCells[i]=newType;
      nextAge[i]=newType===0?0:newAge;

      // Naissances aléatoires
      //if(nextCells[i]===0 && Math.random()<0.8){ nextCells[i]=1+Math.floor(Math.random()*6); nextAge[i]=0; }
      if(Math.random()<0.04){ nextCells[i]=1+Math.floor(Math.random()*6); nextAge[i]=0; }
    }
  }

  const tmpC = cells; cells = nextCells; nextCells = tmpC;
  const tmpA = age; age = nextAge; nextAge = tmpA;

  updateMeshFromCells();
}

/* -------------------- UI + ANIMATION -------------------- */
function randomizeGrid() {
  for(let i=0;i<cells.length;i++){
    if(Math.random()<density/100){ cells[i]=1+Math.floor(Math.random()*6); age[i]=0; }
    else{ cells[i]=0; age[i]=0; }
  }
  updateMeshFromCells();
}

function clearGrid(){
  cells.fill(0);
  age.fill(0);
  updateMeshFromCells();
}

function onPointerDown(e){
  const rect=renderer.domElement.getBoundingClientRect();
  const pointer=new THREE.Vector2();
  pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  const raycaster=new THREE.Raycaster();
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(cubes);
  if(hits.length>0){
    const cube=hits[0].object;
    const i=cubes.indexOf(cube);
    if(i>=0){
      cells[i]=(cells[i]+1)%7;
      age[i]=0;
      updateInstance(i);
    }
  }
}

function animate(time){
  requestAnimationFrame(animate);
  controls.update();
  if(running){
    const interval=1000/speed;
    if(time-lastStepTime>=interval){
      while(time-lastStepTime>=interval){
        stepGeneration();
        lastStepTime+=interval;
      }
    }
  }else lastStepTime=time;
  renderer.render(scene,camera);
}

/* -------------------- EVENTS -------------------- */
renderer.domElement.addEventListener('pointerdown', onPointerDown);

startBtn?.addEventListener('click',()=>{running=true; startBtn.disabled=true; stopBtn.disabled=false; lastStepTime=performance.now();});
stopBtn?.addEventListener('click',()=>{running=false; startBtn.disabled=false; stopBtn.disabled=true;});
stepBtn?.addEventListener('click',()=>stepGeneration());
randomBtn?.addEventListener('click',()=>randomizeGrid());
clearBtn?.addEventListener('click',()=>clearGrid());

speedInput?.addEventListener('input',(e)=>{speed=parseInt(e.target.value)||6; if(speedVal) speedVal.textContent=String(speed);});
sizeInput?.addEventListener('change',()=>{createGrid(parseInt(sizeInput.value)||32); randomizeGrid();});
densityInput?.addEventListener('change',()=>{density=parseInt(densityInput.value)||30;});

window.addEventListener('resize',()=>{
  camera.aspect=container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth,container.clientHeight);
});

createGrid(size);
randomizeGrid();
animate(performance.now());
