import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function nextGen(curr, N) { //moteur du jeu
  const next = new Uint8Array(curr.length) //format de tableau compact et rapide pour la perf et la mémoire
  const idx = (x,y)=>((y+N)%N)*N+((x+N)%N) //index 1D avec modulo pour reboucler les bords (monde torique)
  for (let y=0;y<N;y++) for (let x=0;x<N;x++){ // on parcourt toute la grille
    const i=y*N+x
    let n = //n = somme des 8 voisins
      curr[idx(x-1,y-1)] + curr[idx(x,y-1)] + curr[idx(x+1,y-1)] + //curr = grille actuelle (tableau 1D de 0/1)
      curr[idx(x-1,y  )]                      + curr[idx(x+1,y  )] + 
      curr[idx(x-1,y+1)] + curr[idx(x,y+1)] + curr[idx(x+1,y+1)] 
    const alive = curr[i]===1 //état actuel de la cellule
    next[i] = (alive && (n===2||n===3)) || (!alive && n===3) ? 1 : 0 // règles du game of life
  }
  return next //next = grille suivante
}

export default function GameOfLife({ playing, speed=6, gridSize=64 }) {
  //paramètres & états
  const N = gridSize, count = N*N, spacing=1, size=spacing*N, half=size/2
  const [grid, setGrid] = useState(()=>new Uint8Array(count)) //état de la grille
  const [stepTick, setStepTick] = useState(0) //déclencheur de pas manuel
  const inst = useRef() //ref vers le mesh instancié
  const dummy = useMemo(()=>new THREE.Object3D(),[]) //objet 3D réutilisé pour chaque instance
  const { camera } = useThree()

  useEffect(()=>{  //setup camera selon N
    camera.position.set(0,0,Math.max(40,N*0.7)); 
    camera.lookAt(0,0,0) 
  },[N,camera]) 

  useEffect(()=>{
    const onRandom=()=>{ const g=new Uint8Array(count); for(let i=0;i<count;i++) g[i]=Math.random()<.15?1:0; setGrid(g) } //15% de cellules vivantes dans l'aléatoire
    const onClear =()=> setGrid(new Uint8Array(count))
    const onStep  =()=> setStepTick(t=>t+1)
    //contrôles UI
    addEventListener('gol:random',onRandom)
    addEventListener('gol:clear',onClear)
    addEventListener('gol:step',onStep)
    return ()=>{ removeEventListener('gol:random',onRandom); removeEventListener('gol:clear',onClear); removeEventListener('gol:step',onStep) }
  },[count])

  useEffect(()=>{ setGrid(()=>new Uint8Array(N*N)) },[N]) //reset grille quand on change la taille

  //temporisation des étapes (vitesse de jeu)
  const stepInterval = 1/Math.max(1,speed) //secondes par pas
  const tRef = useRef(0) //accumulateur de temps

  //boucle d'animation
  useFrame((_,delta)=>{
    //mode play selon la vitesse
    if(playing){ tRef.current+=delta; if(tRef.current>=stepInterval){ setGrid(g=>nextGen(g,N)); tRef.current=0 } }
    //mode step (pas par pas)
    if(stepTick){ setGrid(g=>nextGen(g,N)); setStepTick(0) }
    //mise à jour du mesh instancié
    if(!inst.current) return
    let i=0
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ //on parcourt toutes les cellules
      const alive = grid[i]===1
      const px = x*spacing - half + spacing/2
      const py = -(y*spacing - half + spacing/2)
      dummy.position.set(px,py,0) // on setup la position
      dummy.scale.setScalar(alive ? 0.95 : 0.001) // mort = quasi invisible
      dummy.updateMatrix()
      inst.current.setMatrixAt(i, dummy.matrix) //on copie la matrice dans l'instance i
      i++
    }
    inst.current.instanceMatrix.needsUpdate = true
    if(inst.current.instanceColor) inst.current.instanceColor.needsUpdate = true
  })

  //interaction souris pour placer des cellules
  const ray = useMemo(()=>new THREE.Raycaster(),[])
  const mouse = useMemo(()=>new THREE.Vector2(),[])
  useEffect(()=>{
    const onClick=e=>{
      const rect = e.target.getBoundingClientRect?.(); if(!rect) return //on convertit le clic en coordonnées normalisées [-1;1]
      mouse.x = ((e.clientX-rect.left)/rect.width)*2-1
      mouse.y = -((e.clientY-rect.top)/rect.height)*2+1
      ray.setFromCamera(mouse,camera)
      const plane=new THREE.Plane(new THREE.Vector3(0,0,1),0) //fabrication d'un rayon depuis la caméra jusqu'au plan de la grille
      const p=new THREE.Vector3(); ray.ray.intersectPlane(plane,p) //point d'impact converti en coordonnées de la grille + prise en compte du centrage
      const gx=Math.floor((p.x+half)/spacing), gy=Math.floor((-p.y+half)/spacing)
      if(gx>=0&&gx<N&&gy>=0&&gy<N){ //si dans la grille, on toggle l'état de la cellule
        setGrid(g=>{ const c=g.slice(); const idx=gy*N+gx; c[idx]=c[idx]?0:1; return c }) //on clone le tableau pour forcer la mise à jour du tableau
      }
    }
    const dom=document.querySelector('canvas')
    dom?.addEventListener('pointerdown',onClick)
    return ()=> dom?.removeEventListener('pointerdown',onClick)
  },[N,camera,half,spacing,ray,mouse])

  return (
    <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[6, 8, 10]} intensity={1.2} />

    <gridHelper
      args={[size, N, "white", "white"]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -0.01]}
      material-transparent
      material-opacity={0.25}
      material-depthWrite={false}
    />

    <instancedMesh ref={inst} args={[null,null,count]}>
      <boxGeometry args={[0.95,0.95,0.95]} />
      <meshStandardMaterial color="white" roughness={0.5} metalness={0.1} />
    </instancedMesh>
    </>
  )
}
