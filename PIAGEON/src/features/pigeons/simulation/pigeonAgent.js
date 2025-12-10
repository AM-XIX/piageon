import * as THREE from "three";
import { PARTIES, createRandomGenome, randomParty } from "./genetics.js";

export function createPigeonAgent({ id, position, party = randomParty(), genome = createRandomGenome(), groundY = 18 }) {
  const velocity = new THREE.Vector3(
    Math.random() - 0.5,
    0,
    Math.random() - 0.5
  );
  if (velocity.lengthSq() === 0) velocity.set(1, 0, 0);
  velocity.setLength(0.5 + Math.random() * 0.5);

  return {
    id,

    // partie boids (mouvement continu)
    position: position.clone().setY(groundY),
    velocity,
    acceleration: new THREE.Vector3(),

    // partie génétique / politique
    genome,
    party,

    // partie cerveau / clustering
    clusterId: 0,

    // meta
    state: "alive", // | "dying" | "born"
    age: 0,
  };
}

export function createRandomPigeon({ id, worldHalfSize, groundY = 18 }) {
  const radius = worldHalfSize - 1;
  const r = Math.sqrt(Math.random()) * radius;
  const theta = Math.random() * Math.PI * 2;
  const position = new THREE.Vector3(
    Math.cos(theta) * r,
    groundY,
    Math.sin(theta) * r
  );
  return createPigeonAgent({ id, position, groundY });
}

export function createNeutralPigeon({ id, position, groundY = 18 }) {
  return createPigeonAgent({
    id,
    position,
    party: PARTIES.NEUTRAL,
    groundY,
  });
}
