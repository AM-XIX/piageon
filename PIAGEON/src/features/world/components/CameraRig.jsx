import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const MOVE_SPEED = 20; //vitesse de déplacement de la cam

export function CameraRig() {
  const controlsRef = useRef(null);
  const keys = useRef({});

  //gestion des touches
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
      keys.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  //vecteurs temporaires pour le calcul de la direction
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const { camera } = state;
    const target = controls.target;
    const k = keys.current;

    //direction de la cam vers l'avant 
    forward.current.subVectors(target, camera.position);
    forward.current.y = 0;
    if (forward.current.lengthSq() > 0.0001) {
      forward.current.normalize();
    } else {
      forward.current.set(0, 0, -1);
    }

    //direction de la cam vers la droite 
    right.current
      .crossVectors(forward.current, camera.up)
      .normalize();

    //réinitialisation du mouvement
    move.current.set(0, 0, 0);

    //avant / arrière
    if (k["KeyW"] || k["ArrowUp"]) { // touche Z + flèches up
      move.current.add(forward.current);
    }
    if (k["KeyS"] || k["ArrowDown"]) { // touches S + flèches down
      move.current.sub(forward.current);
    }

    //gauche / droite
    if (k["KeyA"] || k["ArrowLeft"]) { // touche A + flèches left
      move.current.sub(right.current);
    }
    if (k["KeyD"] || k["ArrowRight"]) { // touche D + flèches right
      move.current.add(right.current);
    }

    //up / down
    if (k["Space"]) { // barre espace
      move.current.y += 1;
    }
    if (k["ShiftLeft"] || k["ShiftRight"]) { // touche shift gauche ou droite
      move.current.y -= 1;
    }

    if (move.current.lengthSq() > 0) {
      move.current
        .normalize()
        .multiplyScalar(MOVE_SPEED * delta);

      //déplacement de la caméra et de la target pour garder le même angle d’orbite
      camera.position.add(move.current);
      target.add(move.current);

      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}    
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      minDistance={8}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.05} // pour ne pas passer sous le sol
    />
  );
}
