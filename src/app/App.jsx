import { useState, useEffect } from "react";
import { SceneCanvas } from "../features/world/components/SceneCanvas";
import { PigeonHud } from "../features/pigeons/components/PigeonHud.jsx";
import { PigeonCard } from "../features/pigeons/components/PigeonCard.jsx";
import { LoadingScreen } from "./Loading/LoadingScreen.jsx";

export default function App() {
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="app-root">
      {!isReady && <LoadingScreen onFinished={() => setIsReady(true)} />}

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
          Contrôle de la direction de la caméra avec les <strong>Flèches</strong> et <strong>ZQSD</strong>...
        </span>
      </footer>
    </div>
  );
}