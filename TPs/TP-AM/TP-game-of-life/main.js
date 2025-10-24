import * as THREE from "https://unpkg.com/three@0.160.1/build/three.module.js";

/* réglages de base */
const GRID_W = 96, GRID_H = 64; // taille de la grille
const SEED_DENSITY = 0.17; // densité de départ
let SPS = 3; // steps par seconde (lent = on voit mieux)

/* état principal */
let playing = true, gen = 0;
const N = GRID_W * GRID_H;
let curr = new Uint8Array(N); // grille actuelle
let next = new Uint8Array(N); // grille suivante

/* petits helpers */
const I = (x, y) => y * GRID_W + x; //  index
const W = (v, m) => (v + m) % m;

/* HUD (affichage texte) */
const genEl  = document.getElementById("gen");
const speedEl= document.getElementById("speed");
const ruleEl = document.getElementById("ruleName");

/* seed aléatoire de départ */
function seed() {
  for (let i = 0; i < N; i++) curr[i] = Math.random() < SEED_DENSITY ? 255 : 0;
}
seed();

/* pré-calcul des 8 voisins de chaque cellule */
const neighbors = new Uint32Array(N * 8);
(function buildNeighbors(){
  let k = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      neighbors[k++] = I(W(x-1,GRID_W), W(y-1,GRID_H));
      neighbors[k++] = I(W(x  ,GRID_W), W(y-1,GRID_H));
      neighbors[k++] = I(W(x+1,GRID_W), W(y-1,GRID_H));
      neighbors[k++] = I(W(x-1,GRID_W), W(y  ,GRID_H));
      neighbors[k++] = I(W(x+1,GRID_W), W(y  ,GRID_H));
      neighbors[k++] = I(W(x-1,GRID_W), W(y+1,GRID_H));
      neighbors[k++] = I(W(x  ,GRID_W), W(y+1,GRID_H));
      neighbors[k++] = I(W(x+1,GRID_W), W(y+1,GRID_H));
    }
  }
})();

/* une génération (Conway) */
function step() {
  for (let i = 0, nIdx = 0; i < N; i++) {
    let n = 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;
    n += curr[neighbors[nIdx++]] ? 1 : 0;

    const alive = curr[i] > 0;
    next[i] = alive ? ((n===2 || n===3) ? 255 : 0) : (n===3 ? 255 : 0);
  }
  [curr, next] = [next, curr]; // échange des buffers
  gen++; genEl.textContent = gen; 
  dataTex.image.data = curr;      
  dataTex.needsUpdate = true;
}

/* rendu 2D */
const container = document.getElementById("app");
const renderer  = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
container.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 10);
camera.position.set(0, 0, 1.35);

const dataTex = new THREE.DataTexture(curr, GRID_W, GRID_H, THREE.RedFormat);
dataTex.needsUpdate = true;
dataTex.magFilter = THREE.NearestFilter;
dataTex.minFilter = THREE.NearestFilter;

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTex: { value: dataTex },
    uGrid: { value: new THREE.Vector2(GRID_W, GRID_H) },
    uAlive: { value: new THREE.Color(0xff4da6) }, // rose = vivant
    uDead: { value: new THREE.Color(0x0b0d10) }, // fond sombre = mort
    uGridLines: { value: 1.0 } // grille
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    precision mediump float;
    uniform sampler2D uTex; uniform vec2 uGrid; uniform vec3 uAlive; uniform vec3 uDead; uniform float uGridLines;
    varying vec2 vUv;
    void main(){
      vec2  id = floor(vUv * uGrid);
      float alive = step(0.5, texture2D(uTex, (id + 0.5) / uGrid).r);
      vec3  col = mix(uDead, uAlive, alive);
      vec2  g = fract(vUv * uGrid);
      float line = step(g.x,.02)+step(1.0-g.x,.02)+step(g.y,.02)+step(1.0-g.y,.02);
      col = mix(col, vec3(0.07,0.09,0.11), clamp(uGridLines * line, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0);
    }
  `
});
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1), material);
scene.add(mesh);

/* clic pour poser des cellules */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let dragging = false;
function pickId(ev){
  const r = renderer.domElement.getBoundingClientRect();
  ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObject(mesh)[0];
  if (!hit || !hit.uv) return null;
  const u = hit.uv.x, v = hit.uv.y;
  const x = Math.min(GRID_W-1, Math.max(0, Math.floor(u * GRID_W)));
  const y = Math.min(GRID_H-1, Math.max(0, Math.floor(v * GRID_H)));
  return I(x,y);
}
renderer.domElement.addEventListener("pointerdown", e => {
  dragging = true;
  const id = pickId(e); if (id==null) return;
  curr[id] = curr[id] ? 0 : 255; // clic pour toggle
  dataTex.needsUpdate = true;
});
renderer.domElement.addEventListener("pointermove", e => {
  if (!dragging) return;
  const id = pickId(e); if (id==null) return;
  curr[id] = 255; // drag pour peindre
  dataTex.needsUpdate = true;
});
addEventListener("pointerup", () => { dragging = false; });

/* contrôles simples */
const btn = document.getElementById("toggle");
btn.addEventListener("click", () => { playing = !playing; btn.textContent = playing ? "Pause" : "Play"; });
addEventListener("keydown", e => {
  if (e.code === "Space") { playing = !playing; btn.textContent = playing ? "Pause" : "Play"; e.preventDefault(); }
  if (e.key === "[" || e.key === "ù") { SPS = Math.max(1, SPS - 1); speedEl.textContent = SPS; }
  if (e.key === "]" || e.key === "^") { SPS = Math.min(60, SPS + 1); speedEl.textContent = SPS; }
  if (e.key.toLowerCase() === "r") { seed(); gen = 0; genEl.textContent = gen; dataTex.needsUpdate = true; }
  if (e.key.toLowerCase() === "x") { curr.fill(0); gen = 0; genEl.textContent = gen; dataTex.needsUpdate = true; }
});

/* boucle principale */
let acc = 0, last = performance.now();
function tick(now){
  const dt = (now - last) / 1000; last = now;
  if (playing) {
    acc += dt;
    const s = 1 / SPS;
    while (acc >= s) { step(); acc -= s; } // avance d'un nombre entier de steps
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* resize */
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
speedEl.textContent = SPS;
ruleEl.textContent  = "Conway";
genEl.textContent   = gen;
