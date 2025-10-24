import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function Mandelbulb({
  iterations = 14, // nombre d’itérations pour le DE (DE = Distance Estimator)
  power = 8, // puissance du Mandelbulb
  maxSteps = 140, // nombre max d’étapes de raymarching
  maxDist = 28.0, // distance max de raymarching
  eps = 0.0009, // epsilon pour le hit
  seed = 0.0, // graine pour le bruit
}) {
  const materialRef = useRef()
  const invPV = useMemo(() => new THREE.Matrix4(), []) // inverse(Projection * View)
  const tmp = useMemo(() => new THREE.Matrix4(), []) // matrice temporaire
  const clock = useMemo(() => new THREE.Clock(), []) // temps écoulé pour animation de la caméra
  const { camera, size } = useThree()

  const uniforms = useMemo(() => ({ // valeurs initiales
    uInvPV:      { value: new THREE.Matrix4() }, 
    uCamPos:     { value: new THREE.Vector3() }, // position monde de la caméra
    uResolution: { value: new THREE.Vector2(1, 1) }, // taille du viewport
    uTime:       { value: 0 },
    uMaxSteps:   { value: maxSteps },
    uMaxDist:    { value: maxDist },
    uEps:        { value: eps },
    uPower:      { value: power },
    uIter:       { value: iterations },
    uSeed:       { value: seed },
  }), [])

  useFrame(() => {
    // inv(P*V)
    tmp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    invPV.copy(tmp).invert()

    const m = materialRef.current // shader material
    if (!m) return // on sécurise l'accès

    // sync statiques
    m.uniforms.uInvPV.value.copy(invPV)
    m.uniforms.uCamPos.value.copy(camera.position)
    m.uniforms.uTime.value = clock.getElapsedTime()
    m.uniforms.uResolution.value.set(size.width, size.height)

    // sync dynamiques
    m.uniforms.uPower.value = power
    m.uniforms.uIter.value = iterations
    m.uniforms.uMaxSteps.value = maxSteps | 0 
    m.uniforms.uMaxDist.value = maxDist
    m.uniforms.uEps.value = eps
    m.uniforms.uSeed.value = seed
  })

  return (
    <mesh frustumCulled={false} renderOrder={-999}> {/* on force le dessin en dernier*/}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        depthTest={false}       // <- important : on dessine par-dessus
        depthWrite={false}
        transparent={false}
        toneMapped={false}
      />
    </mesh>
  )
}

const vert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // on ignore toute matrice, on dessine en plein écran
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const frag = /* glsl */`
  precision highp float;
  varying vec2 vUv;

  uniform mat4  uInvPV;        // inverse(Projection * View)
  uniform vec3  uCamPos;       // position monde de la caméra
  uniform vec2  uResolution;
  uniform float uTime;
  uniform int   uMaxSteps;
  uniform float uMaxDist;
  uniform float uEps;
  uniform float uPower;
  uniform int   uIter;
  uniform float uSeed;

  // utilitaires
  float saturate(float x){ return clamp(x, 0.0, 1.0); }
  vec3  saturate(vec3 v){ return clamp(v, 0.0, 1.0); }

  // bruit 3D basique
  float hash(vec3 p){
    p = fract(p*0.3183099 + vec3(0.1,0.2,0.3));
    p *= 17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
  }

  // interpolation trilineaire lissée pour le bruit 3D
  float noise3D(vec3 p){
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float n000 = hash(i+vec3(0,0,0));
    float n100 = hash(i+vec3(1,0,0));
    float n010 = hash(i+vec3(0,1,0));
    float n110 = hash(i+vec3(1,1,0));
    float n001 = hash(i+vec3(0,0,1));
    float n101 = hash(i+vec3(1,0,1));
    float n011 = hash(i+vec3(0,1,1));
    float n111 = hash(i+vec3(1,1,1));
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z); // on retourne le bruit final
  }

  // bruit fractal basique
  float fbm(vec3 p){
    float a = 0.5;
    float s = 0.0;
    for(int i=0;i<4;i++){
      s += a * noise3D(p);
      p *= 2.03;
      a *= 0.5;
    }
    return s;
  }

  // etimation de distance du Mandelbulb
  float deMandelbulb(vec3 p) {
    vec3 z = p; // point dans l’espace
    float dr = 1.0; // dérivée de la distance
    float r = 0.0; // distance au carré

    // itérations de la fractale
    for (int i = 0; i < 100; i++) {
      if (i >= uIter) break;
      r = length(z);
      if (r > 2.5) break;

      // on évite la division par zéro
      r = max(r, 1e-6);

      // conversion en coordonnées sphériques
      float theta = acos(z.z / r); // angle polaire
      float phi   = atan(z.y, z.x); // angle azimutal
      float zr    = pow(r, uPower); // élévation à la puissance

      dr = pow(r, uPower - 1.0) * uPower * dr + 1.0; 

      // coordonnées sphériques élevées à la puissance
      float sint = sin(theta * uPower);
      z = zr * vec3(
        sint * cos(phi * uPower),
        sint * sin(phi * uPower),
        cos(theta * uPower)
      ) + p;
    }
    // distance estimée (classique)
    return 0.5 * log(length(z)) * length(z) / abs(dr);
  }

  // normale via gradient tétraédrique
  vec3 estimateNormal(vec3 p) {
    const vec2 e = vec2(1.0, -1.0) * 0.5773;
    return normalize(
      e.xyy * deMandelbulb(p + e.xyy * 0.001) +
      e.yyx * deMandelbulb(p + e.yyx * 0.001) +
      e.yxy * deMandelbulb(p + e.yxy * 0.001) +
      e.xxx * deMandelbulb(p + e.xxx * 0.001)
    );
  }

  // création du rayon depuis la caméra
  void makeRay(out vec3 ro, out vec3 rd) {
    // coordonnées NDC (NDC = Normalized Device Coordinates)
    vec2 uv = vUv * 2.0 - 1.0;
    vec4 ndcNear = vec4(uv, -1.0, 1.0);
    vec4 ndcFar  = vec4(uv,  1.0, 1.0);

    vec4 worldNear = uInvPV * ndcNear; worldNear /= worldNear.w;
    vec4 worldFar  = uInvPV * ndcFar;  worldFar  /= worldFar.w;

    ro = uCamPos;                               // <- on part de la caméra
    rd = normalize(worldFar.xyz - worldNear.xyz);
  }

  // principal loop de raymarching
  float raymarch(vec3 ro, vec3 rd, out vec3 p) {
    float t = 0.0;
    for (int i = 0; i < 256; i++) {
      if (i >= uMaxSteps) break; // limite du nombre d’étapes
      p = ro + rd * t; // position actuelle
      float d = deMandelbulb(p); // distance estimée
      if (d < uEps) return t;       // succès
      t += d;
      if (t > uMaxDist) break;      // échec
    }
    return -1.0;
  }

  // simple occlusion ambiante
  float ambientOcclusion(vec3 p, vec3 n){
    float occ = 0.0;
    float sca = 1.0;
    for(int i=0;i<5;i++){
      float h = 0.03 + 0.07*float(i);
      float d = deMandelbulb(p + n*h);
      occ += (h - d)*sca;
      sca *= 0.72;
    }
    return saturate(1.0 - occ);
  }

  // création des couleurs de biomes en fonction de la position de la surface
  vec3 oceanDeep  = vec3(0.02, 0.07, 0.12);
  vec3 oceanShal  = vec3(0.05, 0.20, 0.35);
  vec3 beach      = vec3(0.72, 0.66, 0.45);
  vec3 desert     = vec3(0.80, 0.70, 0.42);
  vec3 savanna    = vec3(0.40, 0.52, 0.30);
  vec3 forest     = vec3(0.18, 0.35, 0.22);
  vec3 tundra     = vec3(0.65, 0.72, 0.78);
  vec3 ice        = vec3(0.90, 0.96, 1.00);
  vec3 rock       = vec3(0.25, 0.27, 0.32);

  // effets de lumière sur les courbes
  float curvatureMask(vec3 p, vec3 n){
    float ao = ambientOcclusion(p, n);
    float slope = 1.0 - saturate(dot(n, vec3(0.0,1.0,0.0)));
    return saturate(0.6*(1.0-ao) + 0.4*slope);
  }

  // calcul de la couleur en fonction du biome
  vec3 biomeColor(vec3 p, vec3 n){
    float r = length(p); // hauteur approximative
    float height = r; // on peut ajuster avec des offsets si besoin
    float lat = saturate(abs(normalize(p).y)); // latitude (0 à l’équateur, 1 aux pôles)
    float slope = 1.0 - saturate(dot(n, vec3(0,1,0))); // pente (0 = plat, 1 = vertical)

    float polar = smoothstep(0.65, 0.90, lat); 
    float equatorial = 1.0 - smoothstep(0.20, 0.45, lat);

    float n1 = fbm(p*0.35 + vec3(uSeed, 3.0+uSeed, -1.0+uSeed));
    float n2 = fbm(p*0.85 + vec3(-1.7+uSeed, 0.9*uSeed, 2.3));
    float region = saturate(0.55*n1 + 0.45*n2);

    float sea = smoothstep(1.00, 1.04, height + (region-0.5)*0.06);

    float shelf = smoothstep(1.00, 1.01, height);
    vec3 seaCol = mix(oceanDeep, oceanShal, shelf);

    // mélange des biomes
    vec3 landEq = mix(savanna, forest, saturate(region*1.2)); 
    vec3 landMd = mix(desert,  savanna, saturate(region));
    vec3 landHi = mix(rock,    tundra,  smoothstep(1.06,1.16,height));
    vec3 landPl = mix(landMd, landEq, equatorial);
    vec3 landLt = mix(landPl, landHi, smoothstep(1.04,1.12,height));
    vec3 landPo = mix(tundra, ice, polar);
    vec3 landCol = mix(landLt, landPo, polar);

    float cliff = smoothstep(0.55, 0.85, slope);
    landCol = mix(landCol, rock, cliff*0.6);

    vec3 base = mix(seaCol, landCol, sea);

    float arch = smoothstep(0.4, 0.8, fbm(p*2.2 + vec3(7.3 + uSeed)));
    base = mix(base, beach, arch * (1.0-sea) * smoothstep(1.00,1.02,height));

    return base;
  }

  // création de l’éclairage final / shading
  vec3 shade(vec3 p, vec3 rd){
    // normale au point
    vec3 n = estimateNormal(p);
    // couleur de base selon le biome
    vec3 albedo = biomeColor(p, n);

    vec3 L = normalize(vec3(0.6, 0.7, 0.4)); // lumière fixe
    float diff = saturate(dot(n, L)); // diffusion simple
    float rim  = pow(saturate(1.0 - dot(n, -rd)), 2.0) * 0.25; // lumière sur les bords (de contour)

    // occlusion ambiante
    float ao   = ambientOcclusion(p, n);
    // courbure pour accentuer les détails
    float curv = curvatureMask(p, n);

    // composition finale
    vec3 col = albedo * (0.25 + 0.9*diff) * ao; // éclairage diffus + ambiant
    col += rim * vec3(0.5,0.7,1.0) * 0.5 * (1.0-ao);
    col = mix(col, col*vec3(1.2,1.1,1.05), curv*0.2);
    return col;
  }

  // ciel simple
  vec3 sky(vec3 rd){
    float t = rd.y*0.5+0.5;
    vec3 hori = vec3(0.07,0.09,0.12);
    vec3 zen  = vec3(0.02,0.03,0.06);
    return mix(hori, zen, saturate(t));
  }

  void main(){
    vec3 ro, rd;  // origine et direction du rayon
    makeRay(ro, rd); // on crée le rayon

    // légère animation de la caméra
    ro += rd * (0.01 * sin(uTime*0.35)); // zoom avant/arrière

    vec3 p; // position d’intersection
    float t = raymarch(ro, rd, p); // raymarching = 

    vec3 bg = sky(rd); // couleur de fond (ciel)
    vec3 col = bg; // couleur finale

    if(t > 0.0){
      col = shade(p, rd); // shading de la surface
      // brume légère
      float fog = 1.0 - exp(-t * 0.28);
      col = mix(col, bg, fog*0.35); // on mélange avec le ciel
    }

    gl_FragColor = vec4(saturate(col), 1.0);
  }
`
