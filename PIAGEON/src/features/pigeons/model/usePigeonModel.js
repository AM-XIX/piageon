import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";

export function usePigeonModel() {
  const gltf = useGLTF("../../../public/pigeon.glb");

  const mesh = useMemo(() => {
    let found = null;
    gltf.scene.traverse((child) => {
      if (!found && child.isMesh) {
        found = child;
      }
    });
    return found;
  }, [gltf]);

  if (!mesh) {
    return { geometry: null, material: null };
  }

  return {
    geometry: mesh.geometry,
    material: mesh.material,
  };
}

useGLTF.preload("/models/pigeon.glb");
