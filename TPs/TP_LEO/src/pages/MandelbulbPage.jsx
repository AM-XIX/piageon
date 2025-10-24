import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import TwoPaneLayout from '../layouts/TwoPaneLayout.jsx'
import CanvasStage from '../components/CanvasStage.jsx'
import Mandelbulb from '../features/mandelbulb/Mandelbulb.jsx'

export default function MandelbulbPage() {

  const [params, setParams] = useState(() => randomParams())

  // on garde en mémoire les paramètres pour afficher les valeurs actuelles dans l'UI
  const info = useMemo(() => ({
    iterations: params.iterations,
    power: params.power,
    maxSteps: params.maxSteps,
    eps: params.eps,
    seed: params.seed,
  }), [params])

  const handleRandomize = () => setParams(randomParams())

  return (
    <TwoPaneLayout
      stage={
        <CanvasStage
          camera={{ position:[0,0,4], fov:45, near:0.01, far:100 }}
          withDefaultLights={false}   // le shader gère sa “lumière” fixe
          withControls                // orbite + zoom
        >
          <Mandelbulb
            iterations={params.iterations}
            power={params.power}
            maxSteps={params.maxSteps}
            eps={params.eps}
            maxDist={28}
            seed={params.seed}
          />
        </CanvasStage>
      }
      panel={
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h2 style={{margin:0}}>Mandelbulb — Planet</h2>
            <Link to="/" style={{fontSize:12, opacity:0.7, color:"white", textDecorationLine:"none"}}>← Retour</Link>
          </div>

          <button onClick={handleRandomize} style={{marginTop:8}}>
            Randomize Planet
          </button>

          <div style={{marginTop:12, fontSize:14, opacity:0.7, lineHeight:1.5}}>
            <div><b>Iterations</b>: {info.iterations}</div>
            <div><b>Power</b>: {info.power.toFixed(1)}</div>
            <div><b>MaxSteps</b>: {info.maxSteps}</div>
            <div><b>Epsilon</b>: {info.eps}</div>
            <div><b>Seed</b>: {info.seed.toFixed(3)}</div>
          </div>

          <hr style={{border:'none', borderTop:'1px solid #2a2a2a', margin:'16px 0'}} />

        </div>
      }
    />
  )
}

/** Génère des paramètres aléatoires pour la Mandelbulb
 * - iterations : détail géométrique (10–18)
 * - power : forme globale (6.0–10.0)
 * - maxSteps : qualité / perf (100–200)
 * - eps : seuil surface (0.0006–0.0016)
 * - seed : graine pour bruits/biomes
 */
function randomParams(){
  const rand = (min, max) => Math.random() * (max - min) + min
  const randi = (min, max) => Math.floor(rand(min, max+1))

  const power = Math.round(rand(6, 10) * 2) / 2 
  return {
    iterations: randi(10, 18),
    power,
    maxSteps: randi(100, 200),
    eps: Math.round(rand(0.0006, 0.0016) * 10000) / 10000,
    seed: Math.random() * 10.0, // seed large pour bien varier les biomes
  }
}
