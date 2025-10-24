import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{
      display:'grid', placeItems:'center', height:'100%', color:'#eee',
      fontFamily:'system-ui, sans-serif'
    }}>
      <div style={{maxWidth:820, padding:24}}>
        <h1 style={{marginTop:0}}>AUTRE PLANET - Lab</h1>
        <p style={{opacity:0.8}}>
          Choisir un TP pour lancer la scène 3D.
        </p>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))',
          gap:16,
          marginTop:16
        }}>
          <Link to="/tp/game-of-life" className="card-link">
            <div className="card">
              <h3>Game of Life - TP1</h3>
              <p>Automate cellulaire</p>
            </div>
          </Link>
          <Link to="/tp/mandelbulb" className="card-link">
            <div className="card">
              <h3>Mandelbulb - TP2</h3>
              <p>Planète fractale</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
