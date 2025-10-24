import { useState } from 'react'
import TwoPaneLayout from '../layouts/TwoPaneLayout.jsx'
import CanvasStage from '../components/CanvasStage.jsx'
import GameOfLife from '../features/gameoflife/GameOfLife.jsx'
import { Link } from 'react-router-dom'

export default function GameOfLifePage() {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(6)
  const [gridSize, setGridSize] = useState(64)

  return (
    <TwoPaneLayout
      stage={
        <CanvasStage camera={{ position:[0,0,80], fov:50 }}>
          <GameOfLife playing={playing} speed={speed} gridSize={gridSize} />
        </CanvasStage>
      }
      panel={
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h2 style={{margin:0}}>Game of Life</h2>
            <Link to="/" style={{fontSize:12, opacity:0.7, color:"white", textDecorationLine:"none"}}>← Retour</Link>
          </div>

          <button onClick={() => setPlaying(p => !p)} style={{marginTop:12}}>
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
        </div>
      }
    />
  )
}
