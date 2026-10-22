import * as C from "../constants/physics";
import type { GravityFieldEntity, ObstacleEntity, ObstacleSettings, OilItemEntity, Vec3 } from "../types";
import { clamp } from "./physics";

export type Rng = () => number;

export interface WorldState {
  fields: GravityFieldEntity[];
  obstacles: ObstacleEntity[];
  oilItems: OilItemEntity[];
  nextFieldZ: number;
  nextObstacleZ: number;
  idSeq: number;
  lastOilTimeSec: number;
  oilActive: boolean;
  rng: Rng;
}

function randRange(rng: Rng, a: number, b: number): number {
  return a + rng() * (b - a);
}

export function createWorldState(rng: Rng = Math.random): WorldState {
  return {
    fields: [],
    obstacles: [],
    oilItems: [],
    nextFieldZ: randRange(rng, C.FIELD_FIRST_Z_MIN, C.FIELD_FIRST_Z_MAX),
    nextObstacleZ: C.OBSTACLE_FIRST_Z,
    idSeq: 1,
    lastOilTimeSec: -999,
    oilActive: false,
    rng,
  };
}

export function spawnFields(world: WorldState, playerZ: number): void {
  const { rng } = world;
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
        x: randRange(rng, -C.PLAYFIELD_HALF_WIDTH * 0.55, C.PLAYFIELD_HALF_WIDTH * 0.55),
        y: randRange(rng, -C.PLAYFIELD_HALF_HEIGHT * 0.5, C.PLAYFIELD_HALF_HEIGHT * 0.5),
        z,
      },
      mu,
      displayMass: C.GRAVITY_FIELD_DISPLAY_MASS * (mu / C.GRAVITY_FIELD_MU_BASE),
      influenceRadius: C.GRAVITY_FIELD_INFLUENCE_RADIUS,
      gateRadius: C.GRAVITY_FIELD_GATE_RADIUS,
      resolved: false,
      passed: false,
    });
    world.nextFieldZ += randRange(rng, C.FIELD_SPAWN_INTERVAL_MIN, C.FIELD_SPAWN_INTERVAL_MAX);
  }
}

/**
 * 운석은 자유낙하(수직: 등가속도 운동)와 수평 등속 운동이 합쳐진 포물선 운동을 한다.
 *   x(t) = x0 + vx·t            (수평: 힘이 없으므로 등속)
 *   y(t) = y0 − v0·t − ½·g·t²   (수직: 중력 가속도 g로 등가속도)
 * 두 운동은 서로 독립이라, 같은 높이에서 떨어뜨린 운석과 수평으로 던진 운석은 같은 시각에 같은 높이에 있다.
 *
 * 운석이 "플레이어가 도착할 시점에" 플레이 영역을 지나가도록 위 식을 거꾸로 풀어 출발 위치를 정한다.
 */
export function spawnObstacles(
  world: WorldState,
  playerPos: Vec3,
  playerVel: Vec3,
  settings: ObstacleSettings,
): void {
  const { rng } = world;
  const horizon = playerPos.z + C.OBSTACLE_SPAWN_AHEAD_Z;
  while (world.nextObstacleZ < horizon) {
    const z = world.nextObstacleZ;
    world.nextObstacleZ += randRange(rng, C.OBSTACLE_SPAWN_INTERVAL_MIN, C.OBSTACLE_SPAWN_INTERVAL_MAX);
    if (world.fields.some((f) => z > f.position.z - C.OBSTACLE_GATE_CLEAR_BEFORE && z < f.position.z + C.OBSTACLE_GATE_CLEAR_AFTER)) {
      continue;
    }
    const dz = Math.max(z - playerPos.z, 1);
    // 도착 시간 = 거리 / 평균 속도 (순항 속도가 거리에 따라 올라가는 것을 반영)
    const targetSpeed = Math.min(C.CRUISE_SPEED_BASE + C.CRUISE_SPEED_GAIN_PER_METER * (playerPos.z + dz / 2), C.CRUISE_SPEED_MAX);
    const eta = dz / Math.max((Math.max(playerVel.z, C.MIN_FORWARD_SPEED) + targetSpeed) / 2, 1);

    const aimed = rng() < C.OBSTACLE_AIM_PROB;
    const targetX = aimed
      ? clamp(playerPos.x + randRange(rng, -6, 6), -C.OBSTACLE_AREA_HALF_WIDTH, C.OBSTACLE_AREA_HALF_WIDTH)
      : randRange(rng, -C.OBSTACLE_AREA_HALF_WIDTH, C.OBSTACLE_AREA_HALF_WIDTH);
    const targetY = aimed
      ? clamp(playerPos.y + randRange(rng, -4, 4), -C.OBSTACLE_AREA_HALF_HEIGHT, C.OBSTACLE_AREA_HALF_HEIGHT)
      : randRange(rng, -C.OBSTACLE_AREA_HALF_HEIGHT, C.OBSTACLE_AREA_HALF_HEIGHT);
    const vx = (rng() < 0.5 ? -1 : 1) * settings.horizontalSpeed;
    const v0 = settings.verticalSpeed;
    world.obstacles.push({
      id: world.idSeq++,
      position: {
        x: targetX - vx * eta,
        y: targetY + v0 * eta + 0.5 * C.OBSTACLE_GRAVITY * eta * eta,
        z,
      },
      velocity: { x: vx, y: -v0, z: 0 },
      radius: C.OBSTACLE_RADIUS,
      age: 0,
    });
  }
}

export function maybeSpawnOil(world: WorldState, playerPos: Vec3, fuel: number, nowSec: number): void {
  if (world.oilActive) return;
  if (fuel > C.OIL_TRIGGER_THRESHOLD) return;
  if (nowSec - world.lastOilTimeSec < C.OIL_SPAWN_COOLDOWN) return;
  const { rng } = world;
  world.oilItems.push({
    id: world.idSeq++,
    // 연료가 바닥난 플레이어가 닿을 수 있도록 현재 위치 근처에 둔다
    position: {
      x: clamp(playerPos.x + randRange(rng, -4, 4), -C.PLAYFIELD_HALF_WIDTH, C.PLAYFIELD_HALF_WIDTH),
      y: clamp(playerPos.y + randRange(rng, -3, 3), -C.PLAYFIELD_HALF_HEIGHT, C.PLAYFIELD_HALF_HEIGHT),
      z: playerPos.z + C.OIL_SPAWN_AHEAD_Z,
    },
    radius: C.OIL_ITEM_RADIUS,
    consumed: false,
  });
  world.oilActive = true;
  world.lastOilTimeSec = nowSec;
}

/** 수평은 등속, 수직은 중력 가속도 g (등가속도 운동). 두 축은 서로 영향을 주지 않는다. */
export function stepObstacles(world: WorldState, dt: number): void {
  const g = C.OBSTACLE_GRAVITY;
  for (const o of world.obstacles) {
    o.age += dt;
    o.position.x += o.velocity.x * dt;
    o.position.y += o.velocity.y * dt - 0.5 * g * dt * dt;
    o.velocity.y -= g * dt;
  }
}

export function despawnBehind(world: WorldState, playerZ: number): void {
  const cutoff = playerZ - C.DESPAWN_BEHIND_Z;
  world.fields = world.fields.filter((f) => f.position.z > cutoff);
  world.obstacles = world.obstacles.filter((o) => o.position.z > cutoff);
  // 놓친 기름 아이템이 사라질 때 플래그를 풀어줘야 다시 등장할 수 있다 (안 그러면 영구 소프트락)
  if (world.oilItems.some((o) => !o.consumed && o.position.z <= cutoff)) {
    world.oilActive = false;
  }
  world.oilItems = world.oilItems.filter((o) => o.position.z > cutoff && !o.consumed);
}

export function entityCount(world: WorldState): number {
  return world.fields.length + world.obstacles.length + world.oilItems.length;
}
