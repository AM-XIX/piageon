import { SceneCanvas } from "../features/world/components/SceneCanvas";
import { PigeonHud } from "../features/pigeons/components/PigeonHud.jsx";
import { PigeonCard } from "../features/pigeons/components/PigeonCard.jsx";

export default function App() {
  return (
    <div className="app-root">
      <header className="ui-header">
        <h1>Piageon – Île aux Pigeons</h1>
      </header>

      <main className="scene-wrapper">
        <SceneCanvas />
        <PigeonHud />
        <PigeonCard />
      </main>

      <footer className="ui-footer">
        <span>
          Contrôle de la direction de la caméra avec les <strong>Flèches</strong> et <strong>ZQSD</strong> & <strong>Space / Shift</strong> pour monter et descendre — Maintenir <strong>F</strong> pour accélérer le temps
        </span>
      </footer>
    </div>
  );
}
