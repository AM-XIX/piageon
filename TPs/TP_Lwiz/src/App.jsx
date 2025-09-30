import { useState } from "react";
import "./App.css";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [gridSize, setGridSize] = useState(10);

  return (
    <div className="layout">
      <Scene isRunning={isRunning} speed={speed} gridSize={gridSize} />
      <ControlPanel
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        speed={speed}
        setSpeed={setSpeed}
        gridSize={gridSize}
        setGridSize={setGridSize}
      />
    </div>
  );
}
