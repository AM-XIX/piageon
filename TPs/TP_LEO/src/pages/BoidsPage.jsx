import CanvasStage from "../components/CanvasStage.jsx";
import Boids from "../features/boids/Boids.jsx";

export default function BoidsPage() {
  return (
    <CanvasStage cameraPosition={[0, 8, 14]}>
      <Boids />
    </CanvasStage>
  );
}
