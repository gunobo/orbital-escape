import * as C from "../constants/physics";
import type { GravityFieldEntity, ObstacleEntity, ObstacleSettings, OilItemEntity } from "../types";

export interface WorldState {
  fields: GravityFieldEntity[];
  obstacles: ObstacleEntity[];
  oilItems: OilItemEntity[];
  nextFieldZ: number;
  nextObstacleZ: number;
  idSeq: number;
  lastOilTimeSec: number;
  oilActive: boolean;
}

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function randSign(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

export function createWorldState(): WorldState {
  return {
    fields: [],
    obstacles: [],
    oilItems: [],
    nextFieldZ: randRange(C.FIELD_SPAWN_INTERVAL_MIN, C.FIELD_SPAWN_INTERVAL_MAX),
    nextObstacleZ: randRange(C.OBSTACLE_SPAWN_INTERVAL_MIN, C.OBSTACLE_SPAWN_INTERVAL_MAX),
    idSeq: 1,
    lastOilTimeSec: -999,
    oilActive: false,
  };
}

export function spawnFields(world: WorldState, playerZ: number): void {
  const horizon = playerZ + C.SPAWN_AHEAD_Z;
  while (world.nextFieldZ < horizon) {
    const z = world.nextFieldZ;
    const mu = Math.min(
      C.GRAVITY_FIELD_MU_BASE + z * C.GRAVITY_FIELD_MU_GAIN_PER_METER,
      C.GRAVITY_FIELD_MU_MAX,
    );
    world.fields.push({
      id: world.idSeq++,
      position: {
        x: randRange(-C.PLAYFIELD_HALF_WIDTH * 0.55, C.PLAYFIELD_HALF_WIDTH * 0.55),
        y: randRange(-C.PLAYFIELD_HALF_HEIGHT * 0.5, C.PLAYFIELD_HALF_HEIGHT * 0.5),
        z,
      },
      mu,
      displayMass: C.GRAVITY_FIELD_DISPLAY_MASS * (mu / C.GRAVITY_FIELD_MU_BASE),
      influenceRadius: C.GRAVITY_FIELD_INFLUENCE_RADIUS,
      gateRadius: C.GRAVITY_FIELD_GATE_RADIUS,
      resolved: false,
      passed: false,
    });
    world.nextFieldZ += randRange(C.FIELD_SPAWN_INTERVAL_MIN, C.FIELD_SPAWN_INTERVAL_MAX);
  }
}

export function spawnObstacles(world: WorldState, playerZ: number, settings: ObstacleSettings): void {
  const horizon = playerZ + C.SPAWN_AHEAD_Z;
  while (world.nextObstacleZ < horizon) {
    const z = world.nextObstacleZ;
    world.obstacles.push({
      id: world.idSeq++,
      position: {
        x: randRange(-C.PLAYFIELD_HALF_WIDTH * 0.8, C.PLAYFIELD_HALF_WIDTH * 0.8),
        y: C.PLAYFIELD_HALF_HEIGHT * 0.9,
        z,
      },
      velocity: {
        x: randSign() * settings.horizontalSpeed,
        y: -Math.max(settings.verticalSpeed, 0.001),
        z: 0,
      },
      radius: C.OBSTACLE_RADIUS,
    });
    world.nextObstacleZ += randRange(C.OBSTACLE_SPAWN_INTERVAL_MIN, C.OBSTACLE_SPAWN_INTERVAL_MAX);
  }
}

export function maybeSpawnOil(world: WorldState, playerZ: number, fuel: number, nowSec: number): void {
  if (world.oilActive) return;
  if (fuel > C.OIL_TRIGGER_THRESHOLD) return;
  if (nowSec - world.lastOilTimeSec < C.OIL_SPAWN_COOLDOWN) return;
  const item: OilItemEntity = {
    id: world.idSeq++,
    position: {
      x: randRange(-4, 4),
      y: randRange(-3, 3),
      z: playerZ + 30,
    },
    radius: C.OIL_ITEM_RADIUS,
    consumed: false,
  };
  world.oilItems.push(item);
  world.oilActive = true;
  world.lastOilTimeSec = nowSec;
}

export function stepObstacles(world: WorldState, dt: number): void {
  for (const o of world.obstacles) {
    o.position.x += o.velocity.x * dt;
    o.position.y += o.velocity.y * dt;
    if (o.position.x > C.PLAYFIELD_HALF_WIDTH || o.position.x < -C.PLAYFIELD_HALF_WIDTH) {
      o.velocity.x *= -1;
    }
  }
}

export function despawnBehind(world: WorldState, playerZ: number): void {
  const cutoff = playerZ - C.DESPAWN_BEHIND_Z;
  world.fields = world.fields.filter((f) => f.position.z > cutoff);
  world.obstacles = world.obstacles.filter((o) => o.position.z > cutoff);
  world.oilItems = world.oilItems.filter((o) => o.position.z > cutoff && !o.consumed);
}

export function entityCount(world: WorldState): number {
  return world.fields.length + world.obstacles.length + world.oilItems.length;
}
