import { useGLTF } from "@react-three/drei";

useGLTF.preload("pigeon.glb");

export function usePigeonModel() {
  const { scene, animations } = useGLTF("pigeon.glb");

  return {
    scene,
    animations,
  };
}