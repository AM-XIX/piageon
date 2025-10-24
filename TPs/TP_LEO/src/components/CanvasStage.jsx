import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function CanvasStage({ children, camera = { position: [0,0,80], fov: 50 } }) {
  return (
    <Canvas camera={camera}>
      <color attach="background" args={['#0a0a0a']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10,10,10]} intensity={0.6} />
      <OrbitControls />
      {children}
    </Canvas>
  )
}