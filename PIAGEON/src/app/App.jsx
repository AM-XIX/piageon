import { SceneCanvas } from "../features/world/components/SceneCanvas";
import { PigeonHud } from "../features/pigeons/components/PigeonHud.jsx";
import { PigeonCard } from "../features/pigeons/components/PigeonCard.jsx";
import GameMenu from "../app/GameMenu.jsx";
import { SimulationProvider } from "../shared/SimulationContext.jsx";
//import GameMenu from "../features/ui/GameMenu";

export default function App() {
  return (
    <SimulationProvider>
      <div className="app-root">
        <header className="ui-header">
          <h1>Piageon – Île aux Pigeons</h1>
        </header>

        <main className="scene-wrapper">
          <SceneCanvas />
          <GameMenu />
        </main>

        <footer className="ui-footer">
          <span>
            Contrôle de la direction de la caméra avec les <strong>Flèches</strong> et{" "}
            <strong>ZQSD</strong> & <strong>Space / Shift</strong> pour monter et descendre
          </span>
        </footer>
      </div>
    </SimulationProvider>
  );
}
