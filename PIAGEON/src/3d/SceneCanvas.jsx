import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { SkyBox } from "./SkyBox";

export function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [15, 18, 20], fov: 45 }}
      dpr={[1, 2]}
    >
      <SkyBox />

      {/* Lumières de base */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.3}
        castShadow
      />

      {/* Sol = future map fractale */}
      <Ground />

      {/* Caméra avec contrôles interactifs */}
      <CameraRig />
      
    </Canvas>
  );
}
