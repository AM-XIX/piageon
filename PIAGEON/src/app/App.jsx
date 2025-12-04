import { SceneCanvas } from "../features/world/components/SceneCanvas";

export default function App() {
  return (
    <div className="app-root">
      <header className="ui-header">
        <h1>Piageon – Île aux Pigeons</h1>
      </header>

      <main className="scene-wrapper">
        <SceneCanvas />
      </main>

      <footer className="ui-footer">
        <span>Contrôle de la direction de la caméra avec les <strong>Flèches</strong> et <strong>ZQSD</strong> & <strong>Space / Shift</strong> pour monter et descendre</span>
      </footer>
    </div>
  );
}
