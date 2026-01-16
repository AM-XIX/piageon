import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./CameraRig.jsx";
import { Vegetation } from "./Vegetation";
import { Ground } from "./Ground.jsx";
import { SkyBox } from "./SkyBox.jsx";
import { PigeonAutomaton } from "../../pigeons/components/PigeonAutomaton.jsx";

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

      <Vegetation />
      <Ground />
      <PigeonAutomaton />
      
    </Canvas>
  );
}
