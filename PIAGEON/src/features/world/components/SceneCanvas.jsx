import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./CameraRig.jsx";
import { Ground } from "./Ground.jsx";
import { SkyBox } from "./SkyBox.jsx";
import { PigeonFlock } from "../../pigeons/components/PigeonFlock.jsx";

export function SceneCanvas() {
  return (
    <Canvas camera={{ position: [15, 18, 20], fov: 45 }} dpr={[1, 2]} >

      <SkyBox />

      <CameraRig />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.3}
        castShadow
      />

      <Ground />

      <PigeonFlock initialCount={70} interactionRadius={3} />
      
    </Canvas>
  );
}
