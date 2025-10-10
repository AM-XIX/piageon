export default function ControlPanel({
  isRunning,
  setIsRunning,
  speed,
  setSpeed,
  gridSize,
  setGridSize,
}) {
  return (
    // Control Panel UI
    <div className="panel" style={{ color: "#8d8d8d" }}>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? "Stop" : "Start"}
      </button>
      <button
        onClick={() => {
          window.dispatchEvent(new Event("clearGrid"));
          setIsRunning(false);
        }}
      >
        Clear
      </button>

      <br />
      <label htmlFor="speedRange">Speed:</label>
      <input
        type="range"
        min="50"
        max="2000"
        step="50"
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
      />

      <br />
      <label htmlFor="sizeSelect">Grid Size:</label>
      <select
        id="sizeSelect"
        value={gridSize}
        onChange={(e) => setGridSize(Number(e.target.value))}
      >
        <option value="10">10x10</option>
        <option value="20">20x20</option>
        <option value="50">50x50</option>
      </select>
    </div>
  );
}
