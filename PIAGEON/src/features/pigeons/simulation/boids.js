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
    const motion = updateLocomotionState(p, dt);
    const params = getBoidParamsForCluster(p.clusterId);

    // idle : reste sur place avec légère dérive
    if (motion.mode === "idle") {
      p.velocity.multiplyScalar(0.9);
      limitVector(p.velocity, params.maxSpeed * 0.2);
      p.position.addScaledVector(p.velocity, dt);
      p.position.y = groundY;
      p.acceleration.set(0, 0, 0);
      continue;
    }

    const steering = computeBoidSteering(
      p,
      agents,
      params,
      worldHalfSize,
      wanderStrength,
      motion
    );
    p.acceleration.add(steering);
    const frameEnergy = steering.lengthSq() * dt;
    if (p.stats) {
      p.stats.energySpent = (p.stats.energySpent ?? 0) + frameEnergy;
    }

    p.velocity.addScaledVector(p.acceleration, dt);
    const speedCap =
      motion.mode === "turn"
        ? params.maxSpeed * 0.35
        : params.maxSpeed * 0.65;
    limitVector(p.velocity, speedCap);

    p.position.addScaledVector(p.velocity, dt);
    p.position.y = groundY;
    p.acceleration.set(0, 0, 0);
  }
}

function computeBoidSteering(p, agents, params, worldHalfSize, wanderStrength, motion) {
  const perception = Math.min(p.genome[IDX_PERCEPTION] ?? 1.2, 1.5); // limite la portée de détection
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

  // légère envie de tourner quand mode "turn"
  if (motion.mode === "turn" && motion.heading) {
    const desired = motion.heading.clone().setLength(maxSpeed * 0.4);
    steerToward(desired, p.velocity, maxSpeed, maxForce);
    steering.add(desired.multiplyScalar(0.5));
  }

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
  const margin = halfSize - 1.5; // léger amorti
  const dist = Math.hypot(agent.position.x, agent.position.z);

  if (dist > margin) {
    desired.set(-agent.position.x, 0, -agent.position.z).setLength(maxSpeed);
  } else if (dist > margin * 0.9) {
    // commence à recentrer avant la bordure
    const factor = (dist - margin * 0.9) / (margin * 0.1);
    desired.set(-agent.position.x, 0, -agent.position.z).setLength(maxSpeed * factor);
  }

  if (desired.lengthSq() === 0) return desired;

  return steerToward(desired, agent.velocity, maxSpeed, maxForce);
}

function randomFlatVector() {
  const v = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
  if (v.lengthSq() === 0) v.set(1, 0, 0);
  return v.normalize();
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function updateLocomotionState(agent, dt) {
  if (!agent.motion) {
    agent.motion = {
      mode: "idle",
      timer: randomRange(0.4, 1.0),
      heading: randomFlatVector(),
    };
  }

  agent.motion.timer -= dt;
  if (agent.motion.timer <= 0) {
    if (agent.motion.mode === "idle") {
      agent.motion.mode = Math.random() < 0.7 ? "walk" : "turn";
      agent.motion.timer = randomRange(1.0, 2.2);
    } else if (agent.motion.mode === "walk") {
      agent.motion.mode = Math.random() < 0.5 ? "idle" : "turn";
      agent.motion.timer = randomRange(0.5, 1.3);
    } else if (agent.motion.mode === "turn") {
      agent.motion.mode = Math.random() < 0.6 ? "walk" : "idle";
      agent.motion.timer = randomRange(0.7, 1.6);
    }
    agent.motion.heading = randomFlatVector();
  }

  return agent.motion;
}

function planarDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function limitVector(v, max) {
  if (v.lengthSq() > max * max) {
    v.setLength(max);
  }
}
