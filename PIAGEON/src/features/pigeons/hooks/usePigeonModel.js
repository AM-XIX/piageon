import { useGLTF, useAnimations } from "@react-three/drei";
import { useRef } from "react";

useGLTF.preload("pigeon.glb");

export function usePigeonModel() {
  const group = useRef();

  const gltf = useGLTF("pigeon.glb");
  const { scene, animations } = gltf;

  const { actions } = useAnimations(animations || [], group);

  return {
    group,        
    scene,        
    animations,
    actions,
  };
}
