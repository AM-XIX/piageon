import * as THREE from "three";
import { getBoidParamsForCluster } from "./brain.js";
import { IDX_MAX_FORCE, IDX_MAX_SPEED, IDX_PERCEPTION, IDX_W_ALI, IDX_W_COH, IDX_W_SEP } from "./genetics.js";

const WORLD_HALF_SIZE = 40; // moitié de la taille du monde pour le confinement des pigeons
const GROUND_Y = 18;

const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();

export function updateBoids( agents, dt, { worldHalfSize = WORLD_HALF_SIZE, wanderStrength = 0.4, groundY = GROUND_Y } = {} ) {
  for (let i = 0; i < agents.length; i++) {
    const p = agents[i]; // 
    const params = getBoidParamsForCluster(p.clusterId);

    const steering = computeBoidSteering(
      p,
      agents,
      params,
      worldHalfSize,
      wanderStrength
    );
    p.acceleration.add(steering);
    const frameEnergy = steering.lengthSq() * dt;
    if (p.stats) {
      p.stats.energySpent = (p.stats.energySpent ?? 0) + frameEnergy;
    }

    p.velocity.addScaledVector(p.acceleration, dt);
    limitVector(p.velocity, params.maxSpeed);

    p.position.addScaledVector(p.velocity, dt);
    p.position.y = groundY;
    p.acceleration.set(0, 0, 0);
  }
}

function computeBoidSteering(p, agents, params, worldHalfSize, wanderStrength) {
  const perception = p.genome[IDX_PERCEPTION] ?? 3;
  const maxForce = p.genome[IDX_MAX_FORCE] ?? 0.05;
  const maxSpeed = Math.min(params.maxSpeed, p.genome[IDX_MAX_SPEED] ?? params.maxSpeed);

  const separation = tmpVec.set(0, 0, 0);
  const alignment = tmpVec2.set(0, 0, 0);
  const cohesion = new THREE.Vector3();
  const allyCohesion = new THREE.Vector3();
  let neighbors = 0;
  let allies = 0;

  for (let i = 0; i < agents.length; i++) {
    const other = agents[i];
    if (other === p) continue;

    const dist = planarDistance(p.position, other.position);
    if (dist > 0 && dist < perception) {
      neighbors++;

      // Séparation
      const diff = other.position.clone().sub(p.position).multiplyScalar(-1 / (dist * dist));
      separation.add(diff);

      // Alignement
      alignment.add(other.velocity);

      // Cohésion
      cohesion.add(other.position);

      if (other.party === p.party) {
        allies++;
        allyCohesion.add(other.position);
      }
    }
  }

  const steering = new THREE.Vector3();

  if (neighbors > 0) {
    alignment.divideScalar(neighbors);
    alignment.y = 0;
    steerToward(alignment, p.velocity, maxSpeed, maxForce);
    alignment.multiplyScalar(params.wAli * p.genome[IDX_W_ALI]);

    cohesion.divideScalar(neighbors).sub(p.position);
    cohesion.y = 0;
    steerToward(cohesion, p.velocity, maxSpeed, maxForce);
    cohesion.multiplyScalar(params.wCoh * p.genome[IDX_W_COH]);

    steerToward(separation, p.velocity, maxSpeed, maxForce);
    separation.multiplyScalar(params.wSep * p.genome[IDX_W_SEP]);

    steering.add(separation).add(alignment).add(cohesion);
  }

  // encourage le  clustering avec les alliés pour garder les parties ensembles
  if (allies > 0 && (params.allyPull ?? 0) > 0) {
    allyCohesion.divideScalar(allies).sub(p.position);
    allyCohesion.y = 0;
    steerToward(allyCohesion, p.velocity, maxSpeed, maxForce);
    allyCohesion.multiplyScalar(params.allyPull);
    steering.add(allyCohesion);
  }

  // garde les pigeons au sol
  steering.add(steerToBounds(p, maxSpeed, maxForce, worldHalfSize));

  // implentation de quelques mouvements aléatoires pour éviter les déplacements statiques
  const wander = randomFlatVector().setLength(maxForce * wanderStrength);
  steering.add(wander);

  limitVector(steering, maxForce * 3);
  steering.y = 0;
  return steering;
}

function steerToward(desired, currentVelocity, maxSpeed, maxForce) {
  if (desired.lengthSq() === 0) return desired;
  desired.setLength(maxSpeed);
  desired.sub(currentVelocity);
  limitVector(desired, maxForce);
  return desired;
}

function steerToBounds(agent, maxSpeed, maxForce, halfSize) {
  const desired = new THREE.Vector3();
  const margin = halfSize - 2;

  if (agent.position.x > margin) desired.x = -maxSpeed;
  else if (agent.position.x < -margin) desired.x = maxSpeed;

  if (agent.position.z > margin) desired.z = -maxSpeed;
  else if (agent.position.z < -margin) desired.z = maxSpeed;

  if (desired.lengthSq() === 0) return desired;

  desired.y = 0;
  return steerToward(desired, agent.velocity, maxSpeed, maxForce);
}

function randomFlatVector() {
  const v = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
  if (v.lengthSq() === 0) v.set(1, 0, 0);
  return v.normalize();
}

function planarDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function limitVector(v, max) {
  if (v.lengthSq() > max * max) {
    v.setLength(max);
  }
}
