import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import "../Loading/loading.css";

const LOADING_MESSAGES = [
  "Préparation des modèles 3D de Louise...",
  "Génération de la patience de Léo face aux boids...",
  "Ajustement des idées politiques d'Anna Maria...",
  "Résolution des conflits de merge de Marie...",
  "Distribution des graines pour les pigeons...",
];

export function LoadingScreen({ onFinished }) {
  const { active, progress } = useProgress();
  const [fakeProgress, setFakeProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFakeProgress((prev) => (prev < 100 ? prev + 1 : 100));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
        return LOADING_MESSAGES[nextIndex];
      });
    }, 1300);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    if (!active && progress === 100 && fakeProgress === 100) {
      const timer = setTimeout(onFinished, 200);
      return () => clearTimeout(timer);
    }
  }, [active, progress, fakeProgress, onFinished]);

  return (
    <div className="loading-overlay-app">
      <div className="loading-content">
        <h2 className="loading-title">
          P<span className="loading-title-highlight">IA</span>GEON
        </h2>

        <div className="loading-bar-bg">
          <div
            className="loading-bar-fill"
            style={{ width: `${fakeProgress}%` }}
          />
        </div>

        <div className="loading-footer">
          {/* Le texte qui change est ici */}
          <div className="loading-message">{currentMessage}</div>
          <div className="loading-text">{Math.round(fakeProgress)}%</div>
        </div>
      </div>
    </div>
  );
}
