import "./App.css";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";

export default function App() {
  return (
    <div className="layout">
      <Scene />
      <ControlPanel />
    </div>
  );
}
