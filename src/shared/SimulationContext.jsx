import React, { createContext, useContext, useMemo, useState } from "react";

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetToken, setResetToken] = useState(0);

  const [parties, setParties] = useState([
    { id: 1, name: "C_RED", color: "#f44336" },
    { id: 2, name: "F_GREEN", color: "#4caf50" },
    { id: 3, name: "M_YELLOW", color: "#ffeb3b" },
    { id: 4, name: "D_BLUE", color: "#2196f3" },
    { id: 5, name: "N_NEUTRAL", color: "#9e9e9e" },
    { id: 6, name: "A_PURPLE", color: "#9c27b0" },
  ]);

  const [partyCounts, setPartyCounts] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

  const value = useMemo(
    () => ({
      isPaused,
      speed,
      resetToken,
      parties,
      partyCounts,

      togglePause: () => setIsPaused((p) => !p),
      pause: () => setIsPaused(true),
      resume: () => setIsPaused(false),
      reset: () => setResetToken((t) => t + 1),
      setSpeed,
      setParties,
      setPartyCounts,
    }),
    [isPaused, speed, resetToken, parties, partyCounts]
  );

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within <SimulationProvider>");
  }
  return ctx;
}
