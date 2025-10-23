import { useState } from "react";
// import GameOfLife from "./components/GameOfLife/GameOfLife";
// import ControlPanel from "./components/GameOfLife/ControlPanel";
import MandelbrotTerrain from "./components/MandelBrot/Mandelbrot";

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [gridSize, setGridSize] = useState(10);

  // height & width for MandelbrotTerrain based on window size
  const mandelbrotWidth = window.innerWidth * 0.9;
  const mandelbrotHeight = window.innerHeight * 0.9;

  return (
    <div className="layout">
      {/* <Scene isRunning={isRunning} speed={speed} gridSize={gridSize} /> 
      <ControlPanel
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        speed={speed}
        setSpeed={setSpeed}
        gridSize={gridSize}
        setGridSize={setGridSize}
      />*/}

      <MandelbrotTerrain width={mandelbrotWidth} height={mandelbrotHeight} />

    </div>
  );
}
