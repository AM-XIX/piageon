import { useEffect } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import skyTextureUrl from "../../../assets/textures/sky/cloudy_midday_8k.png";

export function SkyBox() {
  const texture = useLoader(THREE.TextureLoader, skyTextureUrl);
  const { scene } = useThree();

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    scene.background = texture;
    scene.environment = texture;

    return () => {
      scene.background = null;
      scene.environment = null;
    };
  }, [texture, scene]);

  return null;
}
