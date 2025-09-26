import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState } from 'react'
import Scene from './components/Scene.jsx'
import './App.css'

export default function App() {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(6)
  const [gridSize, setGridSize] = useState(64)

  return (
    <div className="layout">
      <div className="stage">
        <Canvas camera={{ position: [0, 0, 80], fov: 50 }}>
          <color attach="background" args={['#0a0a0a']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10,10,10]} intensity={0.6} />
          <OrbitControls />
          <Scene playing={playing} speed={speed} gridSize={gridSize} />
        </Canvas>
      </div>
      <aside className="panel">
        <h2>Game of Life</h2>
        <button onClick={() => setPlaying(p => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <label style={{display:'block', marginTop:12}}>
          Speed: {speed} steps/s
          <input type="range" min="1" max="30" value={speed}
                 onChange={e => setSpeed(+e.target.value)} />
        </label>
        <label style={{display:'block', marginTop:12}}>
          Grid:
          <select value={gridSize} onChange={e => setGridSize(+e.target.value)}>
            {[32,48,64,96,128].map(n => <option key={n} value={n}>{n}×{n}</option>)}
          </select>
        </label>
        <div style={{marginTop:12}}>
          <button onClick={() => window.dispatchEvent(new Event('gol:step'))}>Step</button>
          <button onClick={() => window.dispatchEvent(new Event('gol:random'))} style={{marginLeft:8}}>Random</button>
          <button onClick={() => window.dispatchEvent(new Event('gol:clear'))} style={{marginLeft:8}}>Clear</button>
        </div>
      </aside>
    </div>
  )
}
