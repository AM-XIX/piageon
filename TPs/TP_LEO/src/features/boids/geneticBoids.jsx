export const GENE_COUNT = 6;

// indices des gènes dans le génome
export const IDX_W_SEP = 0;
export const IDX_W_ALI = 1;
export const IDX_W_COH = 2;
export const IDX_PERCEPTION = 3;
export const IDX_MAX_SPEED = 4;
export const IDX_MAX_FORCE = 5;

// bornes pour chaque gène (inspirées de tes valeurs actuelles)
const MIN_GENES = [
  0.5,  // wSep
  0.2,  // wAli
  0.2,  // wCoh
  1.5,  // perception
  1.0,  // maxSpeed
  0.01, // maxForce
];

const MAX_GENES = [
  3.0,  // wSep
  2.5,  // wAli
  2.5,  // wCoh
  6.0,  // perception
  4.0,  // maxSpeed
  0.08, // maxForce
];

const MUTATION_RATE = 0.2;   // proba de muter un gène
const MUTATION_STEP = 0.2;   // amplitude relative de mutation
const EPS = 1e-4;            // pour éviter division par 0

// durée d'une génération (en secondes de simu)
export const GEN_DURATION = 20;

// --------- OUTILS INTERNES ----------------------------------------

function createRandomGenome() {
  const g = new Float32Array(GENE_COUNT);
  for (let k = 0; k < GENE_COUNT; k++) {
    const min = MIN_GENES[k];
    const max = MAX_GENES[k];
    g[k] = min + Math.random() * (max - min);
  }
  return g;
}

function initPopulation(size) {
  return Array.from({ length: size }, () => createRandomGenome());
}

function clampGenome(g) {
  for (let k = 0; k < GENE_COUNT; k++) {
    const min = MIN_GENES[k];
    const max = MAX_GENES[k];
    if (g[k] < min) g[k] = min;
    else if (g[k] > max) g[k] = max;
  }
  return g;
}

// recombinaison arithmétique (représentation réelle)
function crossoverArithmetic(p1, p2) {
  const c1 = new Float32Array(GENE_COUNT);
  const c2 = new Float32Array(GENE_COUNT);

  for (let k = 0; k < GENE_COUNT; k++) {
    const alpha = Math.random();   // [0,1]
    const a = p1[k];
    const b = p2[k];
    c1[k] = alpha * a + (1 - alpha) * b;
    c2[k] = alpha * b + (1 - alpha) * a;
  }

  return [clampGenome(c1), clampGenome(c2)];
}

// mutation = petit bruit aléatoire sur le gène
function mutateGenome(g) {
  for (let k = 0; k < GENE_COUNT; k++) {
    if (Math.random() < MUTATION_RATE) {
      const range = MAX_GENES[k] - MIN_GENES[k];
      const delta = (Math.random() * 2 - 1) * MUTATION_STEP * range;
      g[k] += delta;
    }
  }
  return clampGenome(g);
}

// sélection proportionnelle à la fitness (roulette)
function selectRoulette(pop, fitness, sumFitness) {
  const r = Math.random() * sumFitness;
  let acc = 0;
  for (let i = 0; i < pop.length; i++) {
    acc += fitness[i];
    if (acc >= r) return pop[i];
  }
  return pop[pop.length - 1];
}

// création de la nouvelle génération (avec élitisme)
function makeNextGeneration(pop, fitness, sumFitness) {
  const size = pop.length;
  const next = new Array(size);

  // élitisme : on garde le meilleur tel quel
  let bestIdx = 0;
  let bestFit = fitness[0];
  for (let i = 1; i < size; i++) {
    if (fitness[i] > bestFit) {
      bestFit = fitness[i];
      bestIdx = i;
    }
  }
  next[0] = pop[bestIdx].slice(0);

  // reproduction pour remplir la population
  for (let i = 1; i < size; i += 2) {
    const p1 = selectRoulette(pop, fitness, sumFitness);
    const p2 = selectRoulette(pop, fitness, sumFitness);
    let [c1, c2] = crossoverArithmetic(p1, p2);
    c1 = mutateGenome(c1);
    c2 = mutateGenome(c2);
    next[i] = c1;
    if (i + 1 < size) next[i + 1] = c2;
  }

  return next;
}

// --------- API UTILISÉE PAR LE TP BOIDS ---------------------------

// Contexte génétique pour N pigeons
export function createGeneticContext(N) {
  return {
    N,
    genomes: initPopulation(N),
    fitnessAcc: new Float32Array(N), // accumulation de la distance au centre
    frames: 0,
    time: 0,
    generation: 0,
  };
}

// Récupère les paramètres de boids pour l'individu i
export function getBoidParams(ctx, i) {
  const g = ctx.genomes[i];
  return {
    wSep: g[IDX_W_SEP],
    wAli: g[IDX_W_ALI],
    wCoh: g[IDX_W_COH],
    perception: g[IDX_PERCEPTION],
    maxSpeed: g[IDX_MAX_SPEED],
    maxForce: g[IDX_MAX_FORCE],
  };
}

// Ajoute une contribution de fitness (distance au centre du groupe)
export function accumulateFitness(ctx, i, distCenter) {
  ctx.fitnessAcc[i] += distCenter;
}

// À appeler une fois par frame : avance le temps de la génération.
// Retourne true quand une nouvelle génération vient d'être créée.
export function stepGenetic(ctx, delta) {
  ctx.time += delta;
  ctx.frames += 1;

  if (ctx.time < GEN_DURATION) return false;

  const { N, genomes, fitnessAcc, frames } = ctx;
  const fitness = new Float32Array(N);
  let sumFitness = 0;

  // fitness = 1 / (eps + distance moyenne au centre)
  for (let i = 0; i < N; i++) {
    const avgDist = fitnessAcc[i] / frames;
    const fit = 1 / (EPS + avgDist);
    fitness[i] = fit;
    sumFitness += fit;
  }

  ctx.genomes = makeNextGeneration(genomes, fitness, sumFitness);
  ctx.fitnessAcc.fill(0);
  ctx.frames = 0;
  ctx.time = 0;
  ctx.generation += 1;

  // console.log("Generation", ctx.generation);
  return true;
}

// petite fonction interne pour normaliser un gène entre 0 et 1
function normalizeGene(value, k) {
  const min = MIN_GENES[k];
  const max = MAX_GENES[k];
  return (value - min) / (max - min || 1); // évite division par 0
}

// Couleur dérivée des 3 poids comportementaux : (wSep, wAli, wCoh) -> RGB
export function getGenomeColor(ctx, i) {
  const g = ctx.genomes[i];
  const r = normalizeGene(g[IDX_W_SEP], IDX_W_SEP); // séparation
  const gChan = normalizeGene(g[IDX_W_ALI], IDX_W_ALI); // alignement
  const b = normalizeGene(g[IDX_W_COH], IDX_W_COH); // cohésion

  return { r, g: gChan, b };
}
