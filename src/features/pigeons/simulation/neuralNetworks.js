import * as THREE from "three";
import { PARTIES } from "./genetics.js";

// ------------------------------------------------------------
// 1) Petit MLP tanh : 1 couche cachée, sorties tanh
// ------------------------------------------------------------
function rand(a, b) {
  return (b - a) * Math.random() + a;
}

function makeMatrix(I, J, fill = 0.0) {
  const m = [];
  for (let i = 0; i < I; i++) m.push(new Array(J).fill(fill));
  return m;
}

function sigmoid(x) {
  return Math.tanh(x);
}
function dsigmoid(y) {
  return 1.0 - y * y;
}

class TinyNN {
  constructor(ni, nh, no) {
    this.ni = ni + 1; // bias
    this.nh = nh;
    this.no = no;

    this.ai = new Array(this.ni).fill(1.0);
    this.ah = new Array(this.nh).fill(1.0);
    this.ao = new Array(this.no).fill(1.0);

    this.wi = makeMatrix(this.ni, this.nh);
    this.wo = makeMatrix(this.nh, this.no);

    for (let i = 0; i < this.ni; i++) {
      for (let j = 0; j < this.nh; j++) this.wi[i][j] = rand(-1.0, 1.0);
    }
    for (let j = 0; j < this.nh; j++) {
      for (let k = 0; k < this.no; k++) this.wo[j][k] = rand(-1.0, 1.0);
    }

    this.ci = makeMatrix(this.ni, this.nh, 0.0);
    this.co = makeMatrix(this.nh, this.no, 0.0);
  }

  update(inputs) {
    if (inputs.length !== this.ni - 1) throw new Error("wrong number of inputs");

    for (let i = 0; i < this.ni - 1; i++) this.ai[i] = inputs[i];
    // bias = 1 déjà

    for (let j = 0; j < this.nh; j++) {
      let sum = 0;
      for (let i = 0; i < this.ni; i++) sum += this.ai[i] * this.wi[i][j];
      this.ah[j] = sigmoid(sum);
    }

    for (let k = 0; k < this.no; k++) {
      let sum = 0;
      for (let j = 0; j < this.nh; j++) sum += this.ah[j] * this.wo[j][k];
      this.ao[k] = sigmoid(sum);
    }

    return this.ao.slice();
  }

  backPropagate(targets, N, M) {
    const outputDeltas = new Array(this.no).fill(0);
    for (let k = 0; k < this.no; k++) {
      const err = targets[k] - this.ao[k];
      outputDeltas[k] = dsigmoid(this.ao[k]) * err;
    }

    const hiddenDeltas = new Array(this.nh).fill(0);
    for (let j = 0; j < this.nh; j++) {
      let err = 0;
      for (let k = 0; k < this.no; k++) err += outputDeltas[k] * this.wo[j][k];
      hiddenDeltas[j] = dsigmoid(this.ah[j]) * err;
    }

    for (let j = 0; j < this.nh; j++) {
      for (let k = 0; k < this.no; k++) {
        const change = outputDeltas[k] * this.ah[j];
        this.wo[j][k] += N * change + M * this.co[j][k];
        this.co[j][k] = change;
      }
    }

    for (let i = 0; i < this.ni; i++) {
      for (let j = 0; j < this.nh; j++) {
        const change = hiddenDeltas[j] * this.ai[i];
        this.wi[i][j] += N * change + M * this.ci[i][j];
        this.ci[i][j] = change;
      }
    }
  }
}

// ------------------------------------------------------------
// 2) Cerveau "intention" : sort 2 poids
//    - wSimilar : attraction vers alliés (même parti)
//    - wConvertible : attraction vers ennemis (approx) convertibles
// ------------------------------------------------------------

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function planarDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Convertit tanh [-1,1] => [0,1] pour des "poids d'attraction"
function tanhTo01(t) {
  return clamp01((t + 1) * 0.5);
}

function ensureBrain(p) {
  if (!p.nnIntent) {
    // 10 entrées, 10-12 neurones cachés, 2 sorties
    p.nnIntent = {
      net: new TinyNN(10, 12, 2),
      // hyperparams d’apprentissage en ligne
      lr: 0.15,
      mom: 0.05,
      // petite régulation : n'entraîner que parfois si tu veux (ici on entraîne toujours)
      train: true,
    };
  }
  return p.nnIntent;
}

// ------------------------------------------------------------
// 3) Feature extraction + imitation learning targets
// ------------------------------------------------------------
function computeFeaturesAndTargets(p, agents, perception) {

  // On cherche :
  // - allié le plus proche (même parti)
  // - "convertible approx" le plus proche (autre parti, pas neutral)
  let bestAlly = null;
  let bestAllyDist = Infinity;

  let bestConv = null;
  let bestConvDist = Infinity;

  let allies = 0;
  let convs = 0;
  let total = 1; // p

  for (let i = 0; i < agents.length; i++) {
    const other = agents[i];
    if (other === p) continue;

    const d = planarDistance(p.position, other.position);
    if (d <= 0 || d > perception) continue;

    total++;

    if (other.party === p.party) {
      allies++;
      if (d < bestAllyDist) {
        bestAllyDist = d;
        bestAlly = other;
      }
    } else {
      // approximation "convertible"
      if (other.party !== PARTIES.NEUTRAL) {
        convs++;
        if (d < bestConvDist) {
          bestConvDist = d;
          bestConv = other;
        }
      }
    }
  }

  // Directions normalisées (dx,dz) vers les “meilleures cibles”
  let allyDx = 0, allyDz = 0, allyDistN = 1;
  if (bestAlly) {
    _tmp.copy(bestAlly.position).sub(p.position);
    _tmp.y = 0;
    const len = _tmp.length();
    if (len > 1e-6) {
      _tmp.multiplyScalar(1 / len);
      allyDx = _tmp.x;
      allyDz = _tmp.z;
    }
    allyDistN = clamp01(bestAllyDist / perception);
  }

  let convDx = 0, convDz = 0, convDistN = 1;
  if (bestConv) {
    _tmp2.copy(bestConv.position).sub(p.position);
    _tmp2.y = 0;
    const len = _tmp2.length();
    if (len > 1e-6) {
      _tmp2.multiplyScalar(1 / len);
      convDx = _tmp2.x;
      convDz = _tmp2.z;
    }
    convDistN = clamp01(bestConvDist / perception);
  }

  const speedN = clamp01(p.velocity.length() / 2.0); // 2.0 ~ vitesse "haute" dans ton sim
  const friendRatio = (allies + 1) / total;

  // counts normalisés (si tu as énormément d’agents, ajuste le diviseur)
  const alliesN = clamp01(allies / 8);
  const convsN = clamp01(convs / 8);

  // Entrées (tanh aime bien [-1,1], ici tout est déjà dans [-1,1] ou [0,1]
  // - allyDx/allyDz, convDx/convDz sont dans [-1,1]
  // - distN, ratios, counts, speedN sont dans [0,1]
  const inputs = [
    allyDx, allyDz,
    1 - allyDistN,        // "proximité ally" (plus c’est proche, plus c’est grand)
    convDx, convDz,
    1 - convDistN,        // "proximité conv"
    friendRatio * 2 - 1,  // remap [0,1] => [-1,1]
    alliesN * 2 - 1,
    convsN * 2 - 1,
    speedN * 2 - 1,
  ];

  // Imitation targets (heuristique simple) :
  // - si convertible proche => focus conversion
  // - sinon si ally proche => focus regroupement
  // - sinon rien de spécial
  let wSimT = 0;
  let wConvT = 0;

  const convClose = bestConv && bestConvDist < perception * 0.7;
  const allyClose = bestAlly && bestAllyDist < perception * 0.9;

  if (convClose) {
    wConvT = 1;
    wSimT = 0;
  } else if (allyClose) {
    wSimT = 1;
    wConvT = 0;
  } else {
    wSimT = 0;
    wConvT = 0;
  }

  // On veut des targets en [-1,1] pour coller aux sorties tanh
  const targets = [
    wSimT * 2 - 1,
    wConvT * 2 - 1,
  ];

  return { inputs, targets, bestAlly, bestConv };
}

// ------------------------------------------------------------
// 4) Fonction appelée depuis boids.js : renvoie un steering Vector3
// ------------------------------------------------------------
export function neuralSteeringStep(p, agents, { perception, maxForce, maxSpeed }) {
  const brain = ensureBrain(p);


  // 1) features + cibles imitation
  const { inputs, targets, bestAlly, bestConv } = computeFeaturesAndTargets(p, agents, perception);


  // 2) forward
  const [outSim, outConv] = brain.net.update(inputs);

  // 3) apprentissage en ligne (imitation)
  if (brain.train) {
    brain.net.backPropagate(targets, brain.lr, brain.mom);
  }

  // 4) Convertit les sorties en "poids d'attraction" [0,1]
  const wSimilar = tanhTo01(outSim);
  const wConvertible = tanhTo01(outConv);

  // 5) Construit deux vecteurs d’attraction (limités)
  const steer = new THREE.Vector3(0, 0, 0);

  if (bestAlly && wSimilar > 0.001) {
    _tmp.copy(bestAlly.position).sub(p.position);
    _tmp.y = 0;
    if (_tmp.lengthSq() > 1e-9) {
      _tmp.setLength(maxSpeed); // désir
      _tmp.sub(p.velocity);     // steering = desired - currentVel
      if (_tmp.lengthSq() > 1e-9) _tmp.setLength(maxForce * wSimilar);
      steer.add(_tmp);
    }
  }

  if (bestConv && wConvertible > 0.001) {
    _tmp2.copy(bestConv.position).sub(p.position);
    _tmp2.y = 0;
    if (_tmp2.lengthSq() > 1e-9) {
      _tmp2.setLength(maxSpeed);
      _tmp2.sub(p.velocity);
      if (_tmp2.lengthSq() > 1e-9) _tmp2.setLength(maxForce * wConvertible);
      steer.add(_tmp2);
    }
  }

  // 6) Un peu de prudence : ne pas écraser le boids
  // (tu peux monter à 2.0 si tu veux plus d'impact)
  if (steer.lengthSq() > 1e-9) {
    steer.setLength(Math.min(steer.length(), maxForce * 1.25));
  }

  steer.y = 0;

  return steer;
}
