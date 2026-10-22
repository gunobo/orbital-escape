import { describe, expect, it } from "vitest";
import { SCREEN_RIGHT_X } from "../constants/camera";
import * as C from "../constants/physics";
import {
  createSim,
  kineticEnergy,
  massFor,
  NO_INPUT,
  potentialEnergy,
  score,
  stepSim,
  type SimState,
} from "./simulation";
import { despawnBehind, maybeSpawnOil, spawnObstacles, stepObstacles } from "./spawner";
import { mulberry32 } from "./testing";

const DT = 1 / 60;
const CALM = { verticalSpeed: 0, horizontalSpeed: 0 };

function calmSim(seed = 1) {
  return createSim(CALM, mulberry32(seed));
}

/** 첫 중력장 가장자리 바로 앞에서 출발시킨다 (위치를 살짝 비껴서 정면 충돌 특이점은 피한다) */
function nearFirstField(sim: SimState, ahead = 24, offsetX = 3) {
  const f = sim.world.fields[0];
  sim.pos.x = f.position.x + offsetX;
  sim.pos.y = f.position.y;
  sim.pos.z = f.position.z - ahead;
  return f;
}

describe("기본 운동", () => {
  it("전진 속도만큼 점수(m)가 오른다", () => {
    const sim = calmSim();
    for (let i = 0; i < 60; i++) stepSim(sim, NO_INPUT, DT);
    expect(score(sim)).toBeGreaterThanOrEqual(12);
    expect(score(sim)).toBeLessThanOrEqual(16);
  });

  it("오른쪽 입력은 화면 오른쪽으로 민다 (카메라가 +z를 보므로 월드 -x)", () => {
    const sim = calmSim();
    stepSim(sim, { ...NO_INPUT, right: true }, DT);
    expect(SCREEN_RIGHT_X).toBe(-1);
    expect(sim.vel.x * SCREEN_RIGHT_X).toBeGreaterThan(0);

    const other = calmSim();
    stepSim(other, { ...NO_INPUT, left: true }, DT);
    expect(other.vel.x * SCREEN_RIGHT_X).toBeLessThan(0);
  });

  it("무거울수록 같은 추력의 가속도는 작아진다 (a = F/m)", () => {
    const light = calmSim();
    const heavy = calmSim();
    light.inertialControl = false;
    heavy.inertialControl = false;
    heavy.mass = 2 * light.mass;
    stepSim(light, { ...NO_INPUT, right: true }, DT);
    stepSim(heavy, { ...NO_INPUT, right: true }, DT);
    expect(heavy.vel.x).toBeCloseTo(light.vel.x / 2, 5);
  });

  it("마우스 조종: 목표 쪽으로 가속하되 엔진 힘 한계(F/m)를 넘지 않는다", () => {
    const sim = calmSim();
    sim.inertialControl = false;
    stepSim(sim, { ...NO_INPUT, target: { x: 10, y: 0 } }, DT);
    expect(sim.vel.x).toBeGreaterThan(0);
    expect(Math.abs(sim.vel.x) / DT).toBeLessThanOrEqual(C.BASE_THRUST_FORCE / sim.mass + 1e-6);
    // 목표 지점에 도착해 있으면 힘을 쓰지 않는다 (연료도 아낀다)
    const rest = calmSim();
    const idleFuel = rest.fuel;
    stepSim(rest, { ...NO_INPUT, target: { x: 0, y: 0 } }, DT);
    expect(rest.vel.x).toBe(0);
    expect(rest.fuel).toBeCloseTo(idleFuel - C.FUEL_DRAIN_IDLE * DT, 9);
  });

  it("연료가 0이면 추력도 제동도 먹지 않는다", () => {
    const sim = calmSim();
    sim.fuel = 0;
    stepSim(sim, { ...NO_INPUT, right: true }, DT);
    expect(sim.vel.x).toBe(0);
  });
});

describe("만유인력 (F = GMm/r²)", () => {
  it("낙하하는 물체의 가속도는 자기 질량과 무관하다 (등가원리)", () => {
    const a = calmSim(7);
    const b = calmSim(7);
    for (const s of [a, b]) s.inertialControl = false;
    nearFirstField(a);
    nearFirstField(b);
    b.mass = 3 * a.mass;
    stepSim(a, NO_INPUT, DT);
    stepSim(b, NO_INPUT, DT);
    expect(b.vel.x).toBeCloseTo(a.vel.x, 9);
    expect(b.vel.y).toBeCloseTo(a.vel.y, 9);
  });

  it("하지만 중력(힘) 자체는 질량에 비례한다", () => {
    const a = calmSim(7);
    const b = calmSim(7);
    nearFirstField(a);
    nearFirstField(b);
    b.mass = 2 * a.mass;
    stepSim(a, NO_INPUT, DT);
    stepSim(b, NO_INPUT, DT);
    expect(b.nearField!.force).toBeCloseTo(2 * a.nearField!.force, 9);
  });

  it("거리가 2배가 되면 중력은 1/4배다 (역제곱 법칙)", () => {
    const near = calmSim(7);
    const far = calmSim(7);
    const f = near.world.fields[0];
    // 같은 축 위에서 거리 8 m 와 16 m (최소 반경 5 m 보다 멀리)
    near.pos = { x: f.position.x, y: f.position.y, z: f.position.z - 8 };
    far.pos = { x: f.position.x, y: f.position.y, z: f.position.z - 16 };
    stepSim(near, NO_INPUT, 1e-6);
    stepSim(far, NO_INPUT, 1e-6);
    expect(near.nearField!.force / far.nearField!.force).toBeCloseTo(4, 1);
  });

  it("작용-반작용: 내가 받는 힘 = 행성이 받는 힘, 가속도는 질량에 반비례", () => {
    const sim = calmSim(7);
    nearFirstField(sim, 15);
    stepSim(sim, NO_INPUT, DT);
    const n = sim.nearField!;
    const m = n.planetMass / n.massRatio; // 이 스텝에서 쓴 내 질량
    expect(n.force).toBeCloseTo(m * n.aMe, 9);
    expect(n.force).toBeCloseTo(n.planetMass * n.aPlanet, 6); // 같은 크기의 힘
    expect(n.aMe / n.aPlanet).toBeCloseTo(n.planetMass / m, 3); // 가속도는 질량에 반비례
  });

  it("게이트를 지나간 뒤에도 중력은 계속 당긴다 (에너지 보존을 위해 갑자기 사라지면 안 됨)", () => {
    const sim = calmSim(7);
    const f = sim.world.fields[0];
    sim.pos = { x: f.position.x + 2, y: f.position.y, z: f.position.z + 10 };
    f.resolved = true;
    stepSim(sim, NO_INPUT, DT);
    expect(sim.nearField).not.toBeNull();
    expect(sim.forces.gravity.z).toBeLessThan(0); // 뒤쪽(행성 쪽)으로 당긴다
  });

  it("중력장 안에서 추력·제동이 없으면 역학적 에너지(KE+PE)가 보존된다", () => {
    const sim = calmSim(7);
    sim.inertialControl = false;
    nearFirstField(sim, 25, 3);
    const mech = () => kineticEnergy(sim) + potentialEnergy(sim);
    const e0 = mech();
    const ke0 = kineticEnergy(sim);
    let maxDev = 0;
    for (let i = 0; i < 1200; i++) {
      sim.fuel = C.FUEL_MAX; // 연료 소모로 질량이 바뀌는 효과를 빼고 순수 중력만 본다
      sim.mass = massFor(sim.fuel);
      stepSim(sim, NO_INPUT, 1 / 600);
      if (!sim.nearField) break;
      maxDev = Math.max(maxDev, Math.abs(mech() - e0));
    }
    expect(maxDev).toBeLessThan(0.02 * ke0);
  });
});

describe("질량·연료·에너지", () => {
  it("연료를 태우면 가벼워지고 기름을 먹으면 무거워진다", () => {
    const sim = calmSim();
    const m0 = sim.mass;
    for (let i = 0; i < 300; i++) stepSim(sim, NO_INPUT, DT);
    expect(sim.mass).toBeLessThan(m0);
    expect(sim.mass).toBeCloseTo(massFor(sim.fuel), 9);

    const before = sim.mass;
    sim.fuel = 10;
    const oil = { id: 999, position: { ...sim.pos }, radius: 1, consumed: false };
    oil.position.z += 0.1;
    sim.world.oilItems.push(oil);
    stepSim(sim, NO_INPUT, DT);
    expect(oil.consumed).toBe(true);
    expect(sim.fuel).toBeGreaterThan(60);
    expect(sim.mass).toBeGreaterThan(massFor(10));
    expect(sim.mass).toBeLessThanOrEqual(before + C.FUEL_MASS_PER_UNIT * C.FUEL_MAX);
  });

  it("관성 제어를 켜면 운동에너지가 줄고 그만큼 연료를 쓴다 (에너지 손실)", () => {
    const on = calmSim();
    const off = calmSim();
    off.inertialControl = false;
    for (const s of [on, off]) {
      s.vel.x = 8;
      s.fuel = 50;
    }
    const e0 = 0.5 * on.mass * 64;
    stepSim(on, NO_INPUT, DT);
    stepSim(off, NO_INPUT, DT);
    expect(on.vel.x).toBeLessThan(8);
    expect(off.vel.x).toBe(8); // 끄면 뉴턴의 관성 법칙: 힘이 없으면 속도 유지
    expect(on.energy.brake).toBeGreaterThan(0);
    expect(on.energy.brake).toBeLessThan(e0);
    expect(on.fuel).toBeLessThan(off.fuel);
  });
});

describe("화면 효과용 사건", () => {
  it("게이트를 지나면 통과/놓침 사건이 생긴다", () => {
    const sim = calmSim();
    const f = sim.world.fields[0];
    sim.pos = { x: f.position.x, y: f.position.y, z: f.position.z - 0.01 };
    stepSim(sim, NO_INPUT, DT);
    const gate = sim.events.find((e) => e.kind === "gate");
    expect(gate && gate.kind === "gate" && gate.passed).toBe(true);

    const miss = calmSim();
    const g = miss.world.fields[0];
    miss.pos = { x: g.position.x + 9, y: g.position.y, z: g.position.z - 0.01 };
    stepSim(miss, NO_INPUT, DT);
    const m = miss.events.find((e) => e.kind === "gate");
    expect(m && m.kind === "gate" && m.passed).toBe(false);
  });

  it("기름을 먹거나 부딪히면 사건이 생긴다", () => {
    const sim = calmSim();
    sim.fuel = 10;
    sim.world.oilItems.push({ id: 7, position: { ...sim.pos, z: sim.pos.z + 0.1 }, radius: 1, consumed: false });
    stepSim(sim, NO_INPUT, DT);
    expect(sim.events.some((e) => e.kind === "oil")).toBe(true);

    const hit = calmSim();
    hit.world.obstacles.push({ id: 8, position: { ...hit.pos, z: hit.pos.z + 0.5 }, velocity: { x: 0, y: 0, z: 0 }, radius: 1, age: 1 });
    stepSim(hit, NO_INPUT, DT);
    expect(hit.gameOver).toBe("collision");
    expect(hit.events.some((e) => e.kind === "crash")).toBe(true);
  });
});

describe("운석: 자유낙하 vs 수평투사", () => {
  const SETTINGS = { verticalSpeed: 0, horizontalSpeed: 0 };

  function pair() {
    const sim = createSim(SETTINGS, mulberry32(1));
    sim.world.obstacles = [];
    const mk = (id: number, vx: number) => ({
      id,
      position: { x: 0, y: 50, z: 100 },
      velocity: { x: vx, y: 0, z: 0 },
      radius: 1,
      age: 0,
    });
    const dropped = mk(1, 0);
    const thrown = mk(2, 6);
    sim.world.obstacles.push(dropped, thrown);
    return { sim, dropped, thrown };
  }

  it("수직 운동은 등가속도: v = g·t, y = y0 − ½g t²", () => {
    const { sim, dropped } = pair();
    for (let i = 0; i < 600; i++) stepObstacles(sim.world, 1 / 600); // 1초
    expect(dropped.velocity.y).toBeCloseTo(-C.OBSTACLE_GRAVITY, 3);
    expect(dropped.position.y).toBeCloseTo(50 - 0.5 * C.OBSTACLE_GRAVITY, 2);
  });

  it("독립성 원리: 수평으로 던져도 같은 시각에 같은 높이에 있다", () => {
    const { sim, dropped, thrown } = pair();
    for (let i = 0; i < 1800; i++) stepObstacles(sim.world, 1 / 600);
    expect(thrown.position.y).toBeCloseTo(dropped.position.y, 9);
    expect(thrown.velocity.y).toBeCloseTo(dropped.velocity.y, 9);
    expect(thrown.position.x).toBeCloseTo(6 * 3, 3); // 수평은 등속
    expect(dropped.position.x).toBe(0);
  });

  it("운석은 플레이어 도착 시점에 플레이 영역을 지나간다 (초기 속도가 달라도)", () => {
    for (const [v0, vx] of [
      [0, 0],
      [3, 2],
      [10, 10],
    ]) {
      const sim = createSim({ verticalSpeed: v0, horizontalSpeed: vx }, mulberry32(3));
      sim.world.obstacles = [];
      sim.world.nextObstacleZ = 60;
      spawnObstacles(sim.world, sim.pos, sim.vel, sim.settings);
      expect(sim.world.obstacles.length).toBeGreaterThanOrEqual(1);
      for (const o of sim.world.obstacles) {
        // 같은 식으로 도착 시간 후의 위치를 계산해 영역 안인지 확인 (수치적으로 진행)
        const eta = Math.max(o.position.z - sim.pos.z, 1) / ((sim.vel.z + Math.min(C.CRUISE_SPEED_BASE + C.CRUISE_SPEED_GAIN_PER_METER * (o.position.z / 2), C.CRUISE_SPEED_MAX)) / 2);
        const x = o.position.x + o.velocity.x * eta;
        const y = o.position.y + o.velocity.y * eta - 0.5 * C.OBSTACLE_GRAVITY * eta * eta;
        expect(Math.abs(x)).toBeLessThanOrEqual(C.OBSTACLE_AREA_HALF_WIDTH + 1e-6);
        expect(Math.abs(y)).toBeLessThanOrEqual(C.OBSTACLE_AREA_HALF_HEIGHT + 1e-6);
      }
    }
  });

  it("시작 직후에는 운석이 없다 (안전 구간)", () => {
    const sim = createSim({ verticalSpeed: 3, horizontalSpeed: 2 }, mulberry32(5));
    for (const o of sim.world.obstacles) expect(o.position.z).toBeGreaterThanOrEqual(C.OBSTACLE_FIRST_Z);
  });
});

describe("기름 아이템", () => {
  it("놓쳐도 다시 등장한다 (소프트락 방지)", () => {
    const sim = calmSim(9);
    maybeSpawnOil(sim.world, sim.pos, 10, 100);
    expect(sim.world.oilItems).toHaveLength(1);
    expect(sim.world.oilActive).toBe(true);

    despawnBehind(sim.world, sim.world.oilItems[0].position.z + C.DESPAWN_BEHIND_Z + 1);
    expect(sim.world.oilItems).toHaveLength(0);
    expect(sim.world.oilActive).toBe(false);

    maybeSpawnOil(sim.world, sim.pos, 10, 100 + C.OIL_SPAWN_COOLDOWN + 1);
    expect(sim.world.oilItems).toHaveLength(1);
  });
});
