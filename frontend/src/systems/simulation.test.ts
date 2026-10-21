import { describe, expect, it } from "vitest";
import * as C from "../constants/physics";
import { createSim, NO_INPUT, score, stepSim } from "./simulation";
import { despawnBehind, maybeSpawnOil, spawnObstacles } from "./spawner";
import { mulberry32 } from "./testing";

const DT = 1 / 60;

describe("simulation", () => {
  it("전진 속도만큼 점수(m)가 오른다", () => {
    const sim = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(1));
    for (let i = 0; i < 60; i++) stepSim(sim, NO_INPUT, DT);
    expect(score(sim)).toBeGreaterThanOrEqual(12);
    expect(score(sim)).toBeLessThanOrEqual(16);
  });

  it("무거울수록 같은 추력의 가속도는 작아진다 (a = F/m)", () => {
    const light = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(1));
    const heavy = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(1));
    heavy.mass = 2;
    stepSim(light, { ...NO_INPUT, right: true }, DT);
    stepSim(heavy, { ...NO_INPUT, right: true }, DT);
    expect(heavy.vel.x).toBeCloseTo(light.vel.x / 2, 5);
  });

  it("연료가 0이면 추력이 먹지 않는다", () => {
    const sim = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(1));
    sim.fuel = 0;
    stepSim(sim, { ...NO_INPUT, right: true }, DT);
    expect(sim.vel.x).toBe(0);
  });

  it("중력은 낙하하는 물체(플레이어)의 질량과 무관한 가속도를 준다 (등가원리)", () => {
    const a = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(7));
    const b = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(7));
    b.mass = 3;
    for (const s of [a, b]) {
      s.pos.z = s.world.fields[0].position.z - 15;
      stepSim(s, NO_INPUT, DT);
    }
    expect(b.vel.x).toBeCloseTo(a.vel.x, 9);
    expect(b.vel.y).toBeCloseTo(a.vel.y, 9);
  });
});

describe("balance regressions", () => {
  it("운석은 플레이어 도착 시점에 플레이 영역을 지나간다 (낙하 속도가 빨라도)", () => {
    for (const [vy, vx] of [
      [0, 0],
      [3, 2],
      [10, 10],
    ]) {
      const sim = createSim({ verticalSpeed: vy, horizontalSpeed: vx }, mulberry32(3));
      spawnObstacles(sim.world, sim.pos, sim.vel, sim.settings);
      expect(sim.world.obstacles.length).toBeGreaterThanOrEqual(2);
      for (const o of sim.world.obstacles) {
        const eta = o.position.z / sim.vel.z;
        const x = o.position.x + o.velocity.x * eta;
        const y = o.position.y + o.velocity.y * eta;
        expect(Math.abs(x)).toBeLessThanOrEqual(C.OBSTACLE_AREA_HALF_WIDTH + 1e-6);
        expect(Math.abs(y)).toBeLessThanOrEqual(C.OBSTACLE_AREA_HALF_HEIGHT + 1e-6);
      }
    }
  });

  it("시작 직후에는 운석이 없다 (안전 구간)", () => {
    const sim = createSim({ verticalSpeed: 3, horizontalSpeed: 2 }, mulberry32(5));
    expect(Math.min(...sim.world.obstacles.map((o) => o.position.z))).toBeGreaterThanOrEqual(C.OBSTACLE_FIRST_Z);
  });

  it("기름 아이템을 놓쳐도 다시 등장한다 (소프트락 방지)", () => {
    const sim = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(9));
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
