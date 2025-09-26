(function () {
  // --- UI éléments ---
  const ui = {
    start: document.getElementById("start"),
    stop: document.getElementById("stop"),
    step: document.getElementById("step"),
    random: document.getElementById("random"),
    clear: document.getElementById("clear"),
    sizeInput: document.getElementById("size"),
    density: document.getElementById("density"),
    speed: document.getElementById("speed"),
    speedVal: document.getElementById("speed-val"),
  };

  let size = Math.max(8, Math.min(256, parseInt(ui.sizeInput.value, 10) || 32));
  let grid, nextGrid;
  let running = false;
  let stepsPerSecond = Number(ui.speed.value);

  // --- three.js setup ---
  const container = document.getElementById("canvas-holder");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(size, size, size * 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Orbit controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.update();

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  // Exemple : créer une grille de cubes visibles
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x2196f3 });
  const group = new THREE.Group();
  scene.add(group);

  function makeGrids(n) {
    grid = new Uint8Array(n * n);
    nextGrid = new Uint8Array(n * n);

    // construire une grille simple de cubes pour test
    group.clear();
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x - n / 2, 0, y - n / 2);
        group.add(cube);
      }
    }
  }

  makeGrids(size);

  // --- boucle d’animation ---
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Pour test : bouton "clear" supprime la grille
  ui.clear.addEventListener("click", () => {
    group.clear();
  });
})();
