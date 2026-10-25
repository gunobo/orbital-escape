import { SCREEN_RIGHT_X } from "../constants/camera";
import * as C from "../constants/physics";
import type { GameOverReason, NearFieldSnapshot, ObstacleSettings, PhysicsSnapshot, Vec3 } from "../types";
import { clamp, distance3, gravityAccelToward, gravityPotential } from "./physics";
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
  /**
   * 마우스 조종: 가고 싶은 위치(월드 x,y). 키 입력이 없을 때 엔진이 그쪽으로 우주선을 보낸다.
   * 엔진은 똑같이 힘 한계(F/m)·연료 소모가 있고, 중력도 그대로 방해한다.
   */
  target?: { x: number; y: number } | null;
}

export interface SimStats {
  /** 이번 판에서 가장 강하게 받은 중력 가속도와 그때의 거리 */
  maxGravAccel: number;
  maxGravAccelR: number;
  minMass: number;
  maxMass: number;
  oilPickups: number;
  gatesPassed: number;
  gatesMissed: number;
  /** 운석에 맞은 횟수 */
  hits: number;
  /** 중력장 안에서 보낸 시간(초) */
  timeInField: number;
}

export interface SimState {
  pos: Vec3;
  vel: Vec3;
  fuel: number;
  mass: number;
  /** 잃은 목숨 수 (게이트를 놓치거나 운석에 맞을 때마다 +1, MAX_MISSES가 되면 끝) */
  misses: number;
  /** 운석에 맞은 뒤 남은 무적 시간(초) */
  invulnerable: number;
  /** 연속 게이트 통과 횟수 */
  streak: number;
  elapsed: number;
  world: WorldState;
  settings: ObstacleSettings;
  gameOver: GameOverReason | null;
  /** 관성 제어(자동 제동) 켜짐 여부 */
  inertialControl: boolean;
  /** 이번 프레임의 힘 벡터(화살표 표시용): 중력·엔진 */
  forces: { gravity: Vec3; thrust: Vec3 };
  nearField: (NearFieldSnapshot & { position: Vec3 }) | null;
  energy: { engine: number; brake: number };
  stats: SimStats;
  /** 이번 프레임에 일어난 사건 (렌더링이 읽고 비운다) */
  events: SimEvent[];
}

/** 화면 효과용 사건: 시뮬레이션이 알려 주면 렌더링이 효과를 입힌다 (로직은 그대로 헤드리스로 돌릴 수 있다) */
export type SimEvent =
  | { kind: "gate"; passed: boolean; position: Vec3; radius: number }
  | { kind: "oil"; position: Vec3 }
  /** 운석에 맞았지만 목숨이 남아 있는 경우 */
  | { kind: "hit"; position: Vec3 }
  /** 마지막 목숨까지 잃은 경우 */
  | { kind: "crash"; position: Vec3 };

export const NO_INPUT: SimInput = { up: false, down: false, left: false, right: false, boost: false };

/** 질량 = 건조 질량 + 연료 질량 */
export function massFor(fuel: number): number {
  return C.DRY_MASS + C.FUEL_MASS_PER_UNIT * fuel;
}

export function createSim(settings: ObstacleSettings, rng: Rng = Math.random): SimState {
  const mass = massFor(C.FUEL_MAX);
  const sim: SimState = {
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: C.CRUISE_SPEED_BASE },
    fuel: C.FUEL_MAX,
    mass,
    misses: 0,
    invulnerable: 0,
    streak: 0,
    elapsed: 0,
    world: createWorldState(rng),
    settings,
    gameOver: null,
    inertialControl: true,
    forces: { gravity: { x: 0, y: 0, z: 0 }, thrust: { x: 0, y: 0, z: 0 } },
    nearField: null,
    energy: { engine: 0, brake: 0 },
    events: [],
    stats: {
      maxGravAccel: 0,
      maxGravAccelR: 0,
      minMass: mass,
      maxMass: mass,
      oilPickups: 0,
      gatesPassed: 0,
      gatesMissed: 0,
      hits: 0,
      timeInField: 0,
    },
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
  sim.invulnerable = Math.max(0, sim.invulnerable - dt);
  const { world, pos, vel } = sim;

  // 1) 중력: 영향 반경 안의 모든 중력장이 당긴다. 게이트를 지나도 중력은 사라지지 않는다.
  let gx = 0;
  let gy = 0;
  let gz = 0;
  let inField = false;
  let near: SimState["nearField"] = null;
  for (const field of world.fields) {
    const d = distance3(pos, field.position);
    if (d > field.influenceRadius) continue;
    inField = true;
    const a = gravityAccelToward(pos, field.position, field.mu);
    gx += a.x;
    gy += a.y;
    gz += a.z;
    if (!near || d < near.r) {
      const aMe = Math.hypot(a.x, a.y, a.z);
      const G = field.mu / field.displayMass;
      const r = Math.max(d, C.GRAVITY_MIN_R);
      near = {
        position: field.position,
        r: d,
        mu: field.mu,
        planetMass: field.displayMass,
        force: sim.mass * aMe,
        aMe,
        aPlanet: (G * sim.mass) / (r * r),
        massRatio: field.displayMass / sim.mass,
        influenceRadius: field.influenceRadius,
      };
    }
  }
  sim.nearField = near;
  sim.forces.gravity = { x: gx * sim.mass, y: gy * sim.mass, z: gz * sim.mass };
  if (near) {
    sim.stats.timeInField += dt;
    if (near.aMe > sim.stats.maxGravAccel) {
      sim.stats.maxGravAccel = near.aMe;
      sim.stats.maxGravAccelR = near.r;
    }
  }

  // 2) 엔진 추력: 힘(F)은 질량과 무관하게 일정하고, 가속도는 a = F/m
  let tx = 0;
  let ty = 0;
  // left/right 는 "화면 기준"이다. 카메라가 +z를 보므로 화면 오른쪽은 월드 -x (constants/camera.ts)
  if (input.left) tx -= SCREEN_RIGHT_X;
  if (input.right) tx += SCREEN_RIGHT_X;
  if (input.up) ty += 1;
  if (input.down) ty -= 1;
  const thrustMag = Math.hypot(tx, ty);
  let ax = gx;
  let ay = gy;
  const az = gz;
  let thrustFuelUse = 0;
  let fx = 0;
  let fy = 0;
  const maxForce = C.BASE_THRUST_FORCE * (input.boost ? C.BOOST_MULTIPLIER : 1);
  if (thrustMag > 0 && sim.fuel > 0) {
    fx = (tx / thrustMag) * maxForce;
    fy = (ty / thrustMag) * maxForce;
    thrustFuelUse = C.FUEL_DRAIN_THRUST + (input.boost ? C.FUEL_DRAIN_BOOST_EXTRA : 0);
  } else if (input.target && sim.fuel > 0) {
    // 목표 위치로 가는 데 필요한 가속도를 구하고(PD 제어), 엔진 힘 한계(F_max)로 자른다
    const wantAx = C.STEER_KP * (input.target.x - pos.x) - C.STEER_KD * vel.x;
    const wantAy = C.STEER_KP * (input.target.y - pos.y) - C.STEER_KD * vel.y;
    const wantForce = Math.hypot(wantAx, wantAy) * sim.mass;
    const force = Math.min(wantForce, maxForce);
    if (wantForce > 1e-6) {
      fx = ((wantAx * sim.mass) / wantForce) * force;
      fy = ((wantAy * sim.mass) / wantForce) * force;
    }
    // 힘을 쓴 만큼만 연료를 쓴다
    thrustFuelUse = (C.FUEL_DRAIN_THRUST + (input.boost ? C.FUEL_DRAIN_BOOST_EXTRA : 0)) * (force / maxForce);
  }
  ax += fx / sim.mass;
  ay += fy / sim.mass;
  sim.forces.thrust = { x: fx, y: fy, z: 0 };
  sim.energy.engine += (fx * vel.x + fy * vel.y) * dt;
  sim.fuel = clamp(sim.fuel - (C.FUEL_DRAIN_IDLE + thrustFuelUse) * dt, 0, C.FUEL_MAX);

  vel.x += ax * dt;
  vel.y += ay * dt;
  vel.z += az * dt;

  // 3) 관성 제어(자동 제동): 줄어든 운동에너지만큼 연료를 쓴다 → 공짜 마찰이 아니라 "에너지 손실"
  if (sim.inertialControl && sim.fuel > 0) {
    const before = vel.x * vel.x + vel.y * vel.y;
    const keep = Math.max(0, 1 - C.INERTIAL_BRAKE_RATE * dt);
    vel.x *= keep;
    vel.y *= keep;
    const lost = 0.5 * sim.mass * before * (1 - keep * keep);
    sim.energy.brake += lost;
    sim.fuel = Math.max(0, sim.fuel - C.BRAKE_FUEL_PER_ENERGY * lost);
  }

  // 4) 순항 장치: 중력장 밖에서만 진행 속도를 목표로 되돌린다 (중력장 안에서는 순수 중력 운동)
  if (!inField) {
    const cruiseTarget = Math.min(
      C.CRUISE_SPEED_BASE + pos.z * C.CRUISE_SPEED_GAIN_PER_METER,
      C.CRUISE_SPEED_MAX,
    );
    vel.z += (cruiseTarget - vel.z) * C.CRUISE_RESTORE_RATE * dt;
  }
  vel.z = Math.max(C.MIN_FORWARD_SPEED, vel.z);

  pos.x = clamp(pos.x + vel.x * dt, -C.PLAYFIELD_HALF_WIDTH, C.PLAYFIELD_HALF_WIDTH);
  pos.y = clamp(pos.y + vel.y * dt, -C.PLAYFIELD_HALF_HEIGHT, C.PLAYFIELD_HALF_HEIGHT);
  pos.z += vel.z * dt;

  for (const field of world.fields) {
    if (!field.resolved && pos.z >= field.position.z) {
      const lateralDist = Math.hypot(pos.x - field.position.x, pos.y - field.position.y);
      field.passed = lateralDist <= field.gateRadius;
      field.resolved = true;
      sim.events.push({ kind: "gate", passed: field.passed, position: { ...field.position }, radius: field.gateRadius });
      if (field.passed) {
        sim.stats.gatesPassed += 1;
        sim.streak += 1;
        if (C.MISS_RECOVER_STREAK > 0 && sim.streak >= C.MISS_RECOVER_STREAK) {
          sim.streak = 0;
          sim.misses = Math.max(0, sim.misses - 1);
        }
      } else {
        sim.stats.gatesMissed += 1;
        sim.streak = 0;
        sim.misses += 1;
        if (sim.misses >= C.MAX_MISSES) sim.gameOver = "gate-miss";
      }
    }
  }

  stepObstacles(world, dt);

  if (sim.invulnerable <= 0 && !sim.gameOver) {
    const hit = world.obstacles.find((o) => distance3(pos, o.position) <= C.PLAYER_RADIUS + o.radius);
    if (hit) {
      // 맞은 운석은 부서져 사라지고, 목숨이 하나 줄며, 잠시 무적이 된다
      world.obstacles = world.obstacles.filter((o) => o !== hit);
      sim.misses += 1;
      sim.stats.hits += 1;
      sim.streak = 0;
      sim.invulnerable = C.HIT_INVULNERABLE_SEC;
      if (sim.misses >= C.MAX_MISSES) {
        sim.gameOver = "collision";
        sim.events.push({ kind: "crash", position: { ...pos } });
      } else {
        sim.events.push({ kind: "hit", position: { ...hit.position } });
      }
    }
  }

  for (const item of world.oilItems) {
    if (item.consumed) continue;
    if (distance3(pos, item.position) <= C.PLAYER_RADIUS + item.radius) {
      item.consumed = true;
      world.oilActive = false;
      sim.fuel = clamp(sim.fuel + C.FUEL_REFILL_OIL, 0, C.FUEL_MAX);
      sim.stats.oilPickups += 1;
      sim.events.push({ kind: "oil", position: { ...item.position } });
    }
  }

  // 질량은 연료량에서 바로 나온다 (태우면 가벼워지고, 기름을 먹으면 무거워진다)
  sim.mass = massFor(sim.fuel);
  sim.stats.minMass = Math.min(sim.stats.minMass, sim.mass);
  sim.stats.maxMass = Math.max(sim.stats.maxMass, sim.mass);

  if (sim.gameOver) return;

  spawnFields(world, pos.z);
  spawnObstacles(world, pos, vel, sim.settings);
  maybeSpawnOil(world, pos, sim.fuel, sim.elapsed);
  despawnBehind(world, pos.z);
}

/** 중력장 안에 있을 때의 중력 퍼텐셜 에너지 (질량 포함) */
export function potentialEnergy(sim: SimState): number {
  let pe = 0;
  for (const field of sim.world.fields) {
    const d = distance3(sim.pos, field.position);
    pe += sim.mass * gravityPotential(d, field.mu, field.influenceRadius);
  }
  return pe;
}

export function kineticEnergy(sim: SimState): number {
  const { x, y, z } = sim.vel;
  return 0.5 * sim.mass * (x * x + y * y + z * z);
}

export function physicsSnapshot(sim: SimState): PhysicsSnapshot {
  const near = sim.nearField;
  const f = sim.forces.thrust;
  const thrustForce = Math.hypot(f.x, f.y);
  return {
    mass: sim.mass,
    inertialControl: sim.inertialControl,
    field: near && {
      r: near.r,
      mu: near.mu,
      planetMass: near.planetMass,
      force: near.force,
      aMe: near.aMe,
      aPlanet: near.aPlanet,
      massRatio: near.massRatio,
      influenceRadius: near.influenceRadius,
    },
    vForward: sim.vel.z,
    vUp: sim.vel.y,
    vRight: sim.vel.x * SCREEN_RIGHT_X,
    thrustForce,
    thrustAccel: thrustForce / sim.mass,
    ke: kineticEnergy(sim),
    pe: potentialEnergy(sim),
    engineWork: sim.energy.engine,
    brakeLoss: sim.energy.brake,
  };
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
