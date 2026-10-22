import { SCREEN_RIGHT_X } from "../constants/camera";
import * as C from "../constants/physics";
import type { FieldInfo, GameOverReason, ObstacleSettings, Vec3 } from "../types";
import { clamp, distance3, gravityAccelToward } from "./physics";
import {
  createWorldState,
  despawnBehind,
  maybeSpawnOil,
  spawnFields,
  spawnObstacles,
  stepObstacles,
  type Rng,
  type WorldState,
} from "./spawner";

export interface SimInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
}

export interface SimState {
  pos: Vec3;
  vel: Vec3;
  fuel: number;
  mass: number;
  misses: number;
  /** 연속 게이트 통과 횟수 */
  streak: number;
  elapsed: number;
  world: WorldState;
  settings: ObstacleSettings;
  gameOver: GameOverReason | null;
  fieldInfo: FieldInfo | null;
}

export const NO_INPUT: SimInput = { up: false, down: false, left: false, right: false, boost: false };

export function createSim(settings: ObstacleSettings, rng: Rng = Math.random): SimState {
  const sim: SimState = {
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: C.CRUISE_SPEED_BASE },
    fuel: C.FUEL_MAX,
    mass: C.PLAYER_BASE_MASS,
    misses: 0,
    streak: 0,
    elapsed: 0,
    world: createWorldState(rng),
    settings,
    gameOver: null,
    fieldInfo: null,
  };
  spawnFields(sim.world, 0);
  spawnObstacles(sim.world, sim.pos, sim.vel, settings);
  return sim;
}

export function score(sim: SimState): number {
  return Math.floor(sim.pos.z);
}

/** 한 프레임(dt초) 만큼 게임 세계를 진행한다. 렌더링과 무관한 순수 로직이라 헤드리스로 돌릴 수 있다. */
export function stepSim(sim: SimState, input: SimInput, dt: number): void {
  if (sim.gameOver) return;
  sim.elapsed += dt;
  const { world, pos, vel } = sim;

  let ax = 0;
  let ay = 0;
  let az = 0;
  sim.fieldInfo = null;

  for (const field of world.fields) {
    if (field.resolved) continue;
    const d = distance3(pos, field.position);
    if (d <= field.influenceRadius) {
      const a = gravityAccelToward(pos, field.position, field.mu);
      ax += a.x;
      ay += a.y;
      az += a.z;
      const r = Math.max(d, C.GRAVITY_MIN_R);
      const fieldG = field.mu / field.displayMass;
      sim.fieldInfo = {
        playerAccel: Math.hypot(a.x, a.y, a.z),
        fieldAccel: (fieldG * sim.mass) / (r * r),
        massRatio: field.displayMass / sim.mass,
      };
    }
  }

  let tx = 0;
  let ty = 0;
  // left/right 는 "화면 기준"이다. 카메라가 +z를 보므로 화면 오른쪽은 월드 -x (constants/camera.ts)
  if (input.left) tx -= SCREEN_RIGHT_X;
  if (input.right) tx += SCREEN_RIGHT_X;
  if (input.up) ty += 1;
  if (input.down) ty -= 1;
  const thrustMag = Math.hypot(tx, ty);
  let thrustFuelUse = 0;
  if (thrustMag > 0 && sim.fuel > 0) {
    const boostMul = input.boost ? C.BOOST_MULTIPLIER : 1;
    const accelMag = (C.BASE_THRUST_FORCE * boostMul) / sim.mass;
    ax += (tx / thrustMag) * accelMag;
    ay += (ty / thrustMag) * accelMag;
    thrustFuelUse = C.FUEL_DRAIN_THRUST + (input.boost ? C.FUEL_DRAIN_BOOST_EXTRA : 0);
  }
  sim.fuel = clamp(sim.fuel - (C.FUEL_DRAIN_IDLE + thrustFuelUse) * dt, 0, C.FUEL_MAX);

  vel.x += ax * dt;
  vel.y += ay * dt;
  vel.z += az * dt;

  const dampFactor = Math.max(0, 1 - C.LATERAL_DAMPING_RATE * dt);
  vel.x *= dampFactor;
  vel.y *= dampFactor;

  const cruiseTarget = Math.min(
    C.CRUISE_SPEED_BASE + pos.z * C.CRUISE_SPEED_GAIN_PER_METER,
    C.CRUISE_SPEED_MAX,
  );
  vel.z += (cruiseTarget - vel.z) * C.CRUISE_RESTORE_RATE * dt;
  vel.z = Math.max(C.MIN_FORWARD_SPEED, vel.z);

  pos.x = clamp(pos.x + vel.x * dt, -C.PLAYFIELD_HALF_WIDTH, C.PLAYFIELD_HALF_WIDTH);
  pos.y = clamp(pos.y + vel.y * dt, -C.PLAYFIELD_HALF_HEIGHT, C.PLAYFIELD_HALF_HEIGHT);
  pos.z += vel.z * dt;

  for (const field of world.fields) {
    if (!field.resolved && pos.z >= field.position.z) {
      const lateralDist = Math.hypot(pos.x - field.position.x, pos.y - field.position.y);
      field.passed = lateralDist <= field.gateRadius;
      field.resolved = true;
      if (field.passed) {
        sim.streak += 1;
        if (C.MISS_RECOVER_STREAK > 0 && sim.streak >= C.MISS_RECOVER_STREAK) {
          sim.streak = 0;
          sim.misses = Math.max(0, sim.misses - 1);
        }
      } else {
        sim.streak = 0;
        sim.misses += 1;
        if (sim.misses >= C.MAX_MISSES) sim.gameOver = "gate-miss";
      }
    }
  }

  stepObstacles(world, dt);

  for (const obstacle of world.obstacles) {
    if (distance3(pos, obstacle.position) <= C.PLAYER_RADIUS + obstacle.radius) {
      sim.gameOver = "collision";
      break;
    }
  }

  for (const item of world.oilItems) {
    if (item.consumed) continue;
    if (distance3(pos, item.position) <= C.PLAYER_RADIUS + item.radius) {
      item.consumed = true;
      world.oilActive = false;
      sim.fuel = clamp(sim.fuel + C.FUEL_REFILL_OIL, 0, C.FUEL_MAX);
      sim.mass = clamp(sim.mass + C.PLAYER_MASS_INCREMENT, C.PLAYER_BASE_MASS, C.PLAYER_MASS_MAX);
    }
  }

  if (sim.gameOver) return;

  spawnFields(world, pos.z);
  spawnObstacles(world, pos, vel, sim.settings);
  maybeSpawnOil(world, pos, sim.fuel, sim.elapsed);
  despawnBehind(world, pos.z);
}

export interface GateGuide {
  /** 게이트까지 남은 거리(m) */
  distance: number;
  /** 게이트 중심이 내 위치보다 화면 기준 오른쪽(+)/왼쪽(-)으로 얼마나 떨어져 있는지(m) */
  right: number;
  /** 위(+)/아래(-) 로 얼마나 떨어져 있는지(m) */
  up: number;
  gateRadius: number;
  /** 지금 위치 그대로 통과하면 성공하는지 */
  aligned: boolean;
}

/** 아직 통과하지 않은 가장 가까운 게이트로 가는 길을 알려준다 (HUD 안내용) */
export function nextGateGuide(sim: SimState): GateGuide | null {
  const field = sim.world.fields.find((f) => !f.resolved && f.position.z > sim.pos.z);
  if (!field) return null;
  const dx = field.position.x - sim.pos.x;
  const dy = field.position.y - sim.pos.y;
  return {
    distance: field.position.z - sim.pos.z,
    right: dx * SCREEN_RIGHT_X,
    up: dy,
    gateRadius: field.gateRadius,
    aligned: Math.hypot(dx, dy) <= field.gateRadius,
  };
}
