import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GameOfLifePage from './pages/GameOfLifePage.jsx'
import MandelbulbPage from './pages/MandelbulbPage.jsx'
import './styles/App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tp/game-of-life" element={<GameOfLifePage />} />
      <Route path="/tp/mandelbulb" element={<MandelbulbPage />} />
      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}