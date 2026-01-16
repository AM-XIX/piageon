import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./CameraRig.jsx";
import { Vegetation } from "./Vegetation";
import { Ground } from "./Ground.jsx";
import { SkyBox } from "./SkyBox.jsx";
import { PigeonFlock } from "../../pigeons/components/PigeonFlock.jsx";

export function SceneCanvas() {
  const [timeScale, setTimeScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyF") setTimeScale(4);
    };
    const handleKeyUp = (e) => {
      if (e.code === "KeyF") setTimeScale(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <Canvas camera={{ position: [15, 18, 20], fov: 45 }} dpr={[1, 2]} >

      <SkyBox />

      <CameraRig />

      <ambientLight intensity={0.65} />
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
