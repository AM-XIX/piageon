// src/features/boids/Boids.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const N = 50; // nombre de boids
const MAX_SPEED = 2.0;
const MAX_FORCE = 0.03;
const PERCEPTION = 2.5; // rayon de perception
const SEP_RADIUS = 1.0; // rayon court pour séparation

const W_SEP = 1.5; // séparation
const W_ALI = 1.0; // alignement
const W_COH = 0.8; // cohésion

const BOUNDS = 12; // cube [-BOUNDS, BOUNDS]

export default function Boids() {
  // buffers positions/vitesses (monde)
  const positions = useMemo(() => new Float32Array(N * 3), []);
  const velocities = useMemo(() => new Float32Array(N * 3), []);

  // initialisation aléatoire
  useMemo(() => {
    for (let i = 0; i < N; i++) {
      positions[3 * i + 0] = (Math.random() * 2 - 1) * BOUNDS * 0.6;
      positions[3 * i + 1] = (Math.random() * 2 - 1) * BOUNDS * 0.6;
      positions[3 * i + 2] = (Math.random() * 2 - 1) * BOUNDS * 0.6;
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      velocities[3 * i + 0] = dir.x;
      velocities[3 * i + 1] = dir.y;
      velocities[3 * i + 2] = dir.z;
    }
  }, [positions, velocities]);

  // instanced mesh
  const inst = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []); // pour manipuler les matrices
  const vTmp = useMemo(() => new THREE.Vector3(), []); // vecteur temporaire
  const vSep = useMemo(() => new THREE.Vector3(), []); // séparation
  const vAli = useMemo(() => new THREE.Vector3(), []); // alignement
  const vCoh = useMemo(() => new THREE.Vector3(), []); // cohésion
  const center = useMemo(() => new THREE.Vector3(), []); // centre des voisins

  const steer = (from, desired, maxForce) => {
    // force de steering = desired - velocity pour ajuster la vitesse et la direction en la limitant
    return desired.sub(from).clampLength(0, maxForce);
  };

  // wrap position dans le cube pour simuler un espace infini
  const wrap = (p) => {
    if (p.x > BOUNDS) p.x = -BOUNDS;
    if (p.x < -BOUNDS) p.x = BOUNDS;
    if (p.y > BOUNDS) p.y = -BOUNDS;
    if (p.y < -BOUNDS) p.y = BOUNDS;
    if (p.z > BOUNDS) p.z = -BOUNDS;
    if (p.z < -BOUNDS) p.z = BOUNDS;
  };

  useFrame((_, dt) => {
    const dtClamped = Math.min(dt, 0.033); // stabilise la simulation si les fps sont bas

    // boucle principale pour chaque boid
    for (let i = 0; i < N; i++) {
      const pi = new THREE.Vector3(
        positions[3 * i + 0],
        positions[3 * i + 1],
        positions[3 * i + 2]
      );
      const vi = new THREE.Vector3(
        velocities[3 * i + 0],
        velocities[3 * i + 1],
        velocities[3 * i + 2]
      );

      vSep.set(0, 0, 0);
      vAli.set(0, 0, 0);
      vCoh.set(0, 0, 0);
      center.set(0, 0, 0);
      let count = 0;
      let countSep = 0;

      // on parse les autres boids(voisins) pour accumuler les forces
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const pj = vTmp.set(
          positions[3 * j + 0],
          positions[3 * j + 1],
          positions[3 * j + 2]
        );
        const d = pi.distanceTo(pj); // distance entre boids
        if (d < PERCEPTION) {
          // alignement & cohésion pour les voisins dans le rayon de perception
          vAli.x += velocities[3 * j + 0];
          vAli.y += velocities[3 * j + 1];
          vAli.z += velocities[3 * j + 2];

          center.add(pj);
          count++;

          // séparation courte portée pour éviter les collisions
          if (d < SEP_RADIUS && d > 0) {
            vSep.add(pi.clone().sub(pj).multiplyScalar(1 / d)); // plus proche = force plus grande pour s’éloigner
            countSep++;
          }
        }
      }

      // calcul des 3 forces (steering)
      let fSep = new THREE.Vector3();
      let fAli = new THREE.Vector3();
      let fCoh = new THREE.Vector3();

      if (countSep > 0) {
        vSep.multiplyScalar(1 / countSep).normalize().multiplyScalar(MAX_SPEED); // calcul de la vitesse désirée
        fSep = steer(vi.clone(), vSep, MAX_FORCE); // force de steering pour la séparation
      }

      if (count > 0) {
        vAli.multiplyScalar(1 / count).normalize().multiplyScalar(MAX_SPEED); // calcul de la vitesse désirée
        fAli = steer(vi.clone(), vAli, MAX_FORCE); // force de steering pour l’alignement

        // cohésion des voisins pour se diriger vers leur centre
        center.multiplyScalar(1 / count);
        const desiredToCenter = center
          .clone()
          .sub(pi)
          .normalize()
          .multiplyScalar(MAX_SPEED);
        fCoh = steer(vi.clone(), desiredToCenter, MAX_FORCE);
      }

      // somme pondérée pour obtenir l’accélération finale
      const acc = fSep.multiplyScalar(W_SEP)
        .add(fAli.multiplyScalar(W_ALI))
        .add(fCoh.multiplyScalar(W_COH));

      // intégration pour la mise à jour position/vitesse des boids
      vi.add(acc).clampLength(0, MAX_SPEED);
      pi.addScaledVector(vi, dtClamped);

      // wrap
      wrap(pi);

      // sauvegarde dans les buffers
      positions[3 * i + 0] = pi.x;
      positions[3 * i + 1] = pi.y;
      positions[3 * i + 2] = pi.z;
      velocities[3 * i + 0] = vi.x;
      velocities[3 * i + 1] = vi.y;
      velocities[3 * i + 2] = vi.z;

      // orienter l’instance dans le sens de la vitesse
      dummy.position.copy(pi);
      if (vi.lengthSq() > 1e-6) {
        dummy.lookAt(pi.clone().add(vi)); // orientation de la direction de la vitesse
      }
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    }
    inst.current.instanceMatrix.needsUpdate = true; // informe Three.js du changement des matrices
  });

  return (
    <group>
      {/* cube */}
        <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(BOUNDS * 2, BOUNDS * 2, BOUNDS * 2)]} />
            <lineBasicMaterial color="#7a7a7a" />
        </lineSegments>
      {/* cônes */}
        <instancedMesh ref={inst} args={[null, null, N]}>
            <coneGeometry args={[0.12, 0.5, 6]} />
            <meshStandardMaterial />
        </instancedMesh>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
    </group>
  );
}
