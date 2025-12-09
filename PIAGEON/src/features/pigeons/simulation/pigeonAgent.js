import * as THREE from "three";
import { PARTIES, createRandomGenome, randomParty } from "./genetics.js";

export function createPigeonAgent({ id, position, party = randomParty(), genome = createRandomGenome() }) {
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
    position: position.clone(),
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

export function createRandomPigeon({ id, worldHalfSize }) {
  const position = new THREE.Vector3(
    (Math.random() * 2 - 1) * (worldHalfSize - 1),
    0,
    (Math.random() * 2 - 1) * (worldHalfSize - 1)
  );
  return createPigeonAgent({ id, position });
}

export function createNeutralPigeon({ id, position }) {
  return createPigeonAgent({
    id,
    position,
    party: PARTIES.NEUTRAL,
  });
}
