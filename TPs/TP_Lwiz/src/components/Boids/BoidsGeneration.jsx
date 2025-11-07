import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export default function BoidsGeneration() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8a9b9f, 0.045);

    const camera = new THREE.PerspectiveCamera(
      70,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      200
    );
    camera.position.set(5, 2.5, 7);

    // HDRI
    new HDRLoader().load("/environment/dikhololo_night_2k.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
    });

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);

    // Lights
    const sunLight = new THREE.DirectionalLight(0xf7ebc6, 2.8);
    sunLight.position.set(5, 10, 3);
    scene.add(sunLight);

    const fillLight = new THREE.AmbientLight(0xbccad3, 1.4);
    scene.add(fillLight);

    // Birds with 3D model + Boids
    const birdGroup = new THREE.Group();
    scene.add(birdGroup);
    const loader = new GLTFLoader();
    const birdCount = 20;
    const birds = [];

    const boidSettings = {
      neighborDist: 3,
      separationDist: 1,
      maxSpeed: 0.02,
      maxForce: 0.001,
    };

    for (let i = 0; i < birdCount; i++) {
      loader.load("/models/bird.glb", (gltf) => {
        const birdPivot = new THREE.Group();
        birdPivot.position.set(
          Math.random() * 20 - 10,
          3 + Math.random() * 3,
          Math.random() * 20 - 10
        );

        const bird = gltf.scene;
        bird.rotation.set(0, -Math.PI / 2, 0);
        bird.scale.set(0.3, 0.3, 0.3);

        birdPivot.add(bird);
        birdGroup.add(birdPivot);

        const mixer =
          gltf.animations.length > 0 ? new THREE.AnimationMixer(bird) : null;
        if (mixer) mixer.clipAction(gltf.animations[0]).play();

        birdPivot.userData = {
          velocity: new THREE.Vector3(
            Math.random() * 0.02,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.02
          ),
          wingDir: Math.random() > 0.5 ? 1 : -1,
          wingSpeed: 5 + Math.random() * 5,
          mixer,
        };

        birds.push(birdPivot);
      });
    }

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45,
      0.6,
      0.3
    );
    composer.addPass(bloomPass);

    const clock = new THREE.Clock();

    const limitVector = (vec, max) => {
      if (vec.length() > max) vec.setLength(max);
    };

    const animate = () => {
      const delta = clock.getDelta();

      birds.forEach((bird, idx) => {
        let v = bird.userData.velocity.clone();

        // Boids rules
        let align = new THREE.Vector3();
        let cohesion = new THREE.Vector3();
        let separation = new THREE.Vector3();
        let count = 0;

        birds.forEach((other, j) => {
          if (idx === j) return;
          const d = bird.position.distanceTo(other.position);
          if (d < boidSettings.neighborDist) {
            align.add(other.userData.velocity);
            cohesion.add(other.position);
            if (d < boidSettings.separationDist) {
              let diff = bird.position.clone().sub(other.position);
              diff.divideScalar(d);
              separation.add(diff);
            }
            count++;
          }
        });

        if (count > 0) {
          align.divideScalar(count);
          limitVector(align, boidSettings.maxForce);

          cohesion.divideScalar(count);
          cohesion.sub(bird.position);
          limitVector(cohesion, boidSettings.maxForce);

          separation.divideScalar(count);
          limitVector(separation, boidSettings.maxForce);

          v.add(align).add(cohesion).add(separation);
        }

        limitVector(v, boidSettings.maxSpeed);
        bird.userData.velocity.copy(v);
        bird.position.add(bird.userData.velocity);

        // garder dans la zone
        if (bird.position.x > 10) bird.position.x = -10;
        if (bird.position.x < -10) bird.position.x = 10;
        if (bird.position.y > 8) bird.position.y = 8;
        if (bird.position.y < 2) bird.position.y = 2;
        if (bird.position.z > 10) bird.position.z = -10;
        if (bird.position.z < -10) bird.position.z = 10;

        // orientation
        const dir = bird.userData.velocity.clone();
        if (dir.length() > 0.001) {
          bird.rotation.y = Math.atan2(-dir.z, dir.x) + Math.PI;
        }

        // battement d’ailes
        const model = bird.children[0];
        if (bird.userData.mixer) bird.userData.mixer.update(delta);
        else
          model.rotation.z =
            Math.sin(clock.elapsedTime * bird.userData.wingSpeed) *
            0.2 *
            bird.userData.wingDir;
      });

      controls.update();
      composer.render();
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
      composer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />;
}
