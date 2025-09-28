

export default function ControlPanel() {
  return (
    <div className="panel" style={{ color: "#8d8d8d" }}>
      <button id="startStopBtn">Start/Stop</button>
      <button id="clearBtn">Clear</button>
      <br />
      <label htmlFor="speedRange">Speed:</label>
      <input
        type="range"
        id="speedRange"
        min="100"
        max="2000"
        step="100"
        defaultValue="1000"
      />
      <br />
      <label htmlFor="sizeSelect">Grid Size:</label>
      <select id="sizeSelect">
        <option value="20">20x20</option>
        <option value="50">50x50</option>
        <option value="100">100x100</option>
      </select>
    </div>
  );
}
