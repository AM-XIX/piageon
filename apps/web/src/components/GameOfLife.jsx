import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function nextGen(curr, N) {
  const next = new Uint8Array(curr.length)
  const idx = (x,y)=>((y+N)%N)*N+((x+N)%N)
  for (let y=0;y<N;y++) for (let x=0;x<N;x++){
    const i=y*N+x
    let n =
      curr[idx(x-1,y-1)] + curr[idx(x,y-1)] + curr[idx(x+1,y-1)] +
      curr[idx(x-1,y  )]                      + curr[idx(x+1,y  )] +
      curr[idx(x-1,y+1)] + curr[idx(x,y+1)] + curr[idx(x+1,y+1)]
    const alive = curr[i]===1
    next[i] = (alive && (n===2||n===3)) || (!alive && n===3) ? 1 : 0
  }
  return next
}

export default function GameOfLife({ playing, speed=6, gridSize=64 }) {
  const N = gridSize, count = N*N, spacing=1, size=spacing*N, half=size/2
  const [grid, setGrid] = useState(()=>new Uint8Array(count))
  const [stepTick, setStepTick] = useState(0)
  const inst = useRef()
  const dummy = useMemo(()=>new THREE.Object3D(),[])
  const color = useMemo(()=>new THREE.Color(),[])
  const { camera } = useThree()

  useEffect(()=>{ camera.position.set(0,0,Math.max(40,N*0.7)); camera.lookAt(0,0,0) },[N,camera])

  useEffect(()=>{
    const onRandom=()=>{ const g=new Uint8Array(count); for(let i=0;i<count;i++) g[i]=Math.random()<.15?1:0; setGrid(g) }
    const onClear =()=> setGrid(new Uint8Array(count))
    const onStep  =()=> setStepTick(t=>t+1)
    addEventListener('gol:random',onRandom)
    addEventListener('gol:clear',onClear)
    addEventListener('gol:step',onStep)
    return ()=>{ removeEventListener('gol:random',onRandom); removeEventListener('gol:clear',onClear); removeEventListener('gol:step',onStep) }
  },[count])

  useEffect(()=>{ setGrid(()=>new Uint8Array(N*N)) },[N])

  const stepInterval = 1/Math.max(1,speed)
  const tRef = useRef(0)

  useFrame((_,delta)=>{
    if(playing){ tRef.current+=delta; if(tRef.current>=stepInterval){ setGrid(g=>nextGen(g,N)); tRef.current=0 } }
    if(stepTick){ setGrid(g=>nextGen(g,N)); setStepTick(0) }

    if(!inst.current) return
    let i=0
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const alive = grid[i]===1
      const px = x*spacing - half + spacing/2
      const py = -(y*spacing - half + spacing/2)
      dummy.position.set(px,py,0)
      dummy.scale.setScalar(alive ? 0.95 : 0.001)
      dummy.updateMatrix()
      inst.current.setMatrixAt(i, dummy.matrix)
      color.set(alive ? '#ffffff' : '#0c0c0c')
      inst.current.setColorAt(i, color)
      i++
    }
    inst.current.instanceMatrix.needsUpdate = true
    if(inst.current.instanceColor) inst.current.instanceColor.needsUpdate = true
  })

  const ray = useMemo(()=>new THREE.Raycaster(),[])
  const mouse = useMemo(()=>new THREE.Vector2(),[])
  useEffect(()=>{
    const onClick=e=>{
      const rect = e.target.getBoundingClientRect?.(); if(!rect) return
      mouse.x = ((e.clientX-rect.left)/rect.width)*2-1
      mouse.y = -((e.clientY-rect.top)/rect.height)*2+1
      ray.setFromCamera(mouse,camera)
      const plane=new THREE.Plane(new THREE.Vector3(0,0,1),0)
      const p=new THREE.Vector3(); ray.ray.intersectPlane(plane,p)
      const gx=Math.floor((p.x+half)/spacing), gy=Math.floor((-p.y+half)/spacing)
      if(gx>=0&&gx<N&&gy>=0&&gy<N){
        setGrid(g=>{ const c=g.slice(); const idx=gy*N+gx; c[idx]=c[idx]?0:1; return c })
      }
    }
    const dom=document.querySelector('canvas')
    dom?.addEventListener('pointerdown',onClick)
    return ()=> dom?.removeEventListener('pointerdown',onClick)
  },[N,camera,half,spacing,ray,mouse])

  return (
    <>
      <gridHelper
          args={[size, N, 0xffffff, 0xffffff]}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, -0.01]}
          material-transparent
          material-opacity={0.25}
          material-depthWrite={false}
        />
      <instancedMesh ref={inst} args={[null,null,count]}>
        <boxGeometry args={[0.95,0.95,0.95]} />
        <meshStandardMaterial vertexColors roughness={0.5} metalness={0.1} />
      </instancedMesh>
    </>
  )
}
