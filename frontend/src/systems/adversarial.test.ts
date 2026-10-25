import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { VIEWS, type ViewId } from "../constants/camera";
import * as C from "../constants/physics";
import { aimPointOnPlane } from "./aim";
import { createSim, kineticEnergy, massFor, NO_INPUT, potentialEnergy, stepSim, type SimInput } from "./simulation";
import { mulberry32 } from "./testing";

/** Scene.tsx와 똑같이 시점별 카메라를 세운다 */
function cameraFor(view: ViewId, ship: THREE.Vector3): THREE.PerspectiveCamera {
  const V = VIEWS[view];
  const cam = new THREE.PerspectiveCamera(V.fov, 16 / 9, 0.1, 500);
  cam.position.set(ship.x * V.followX + V.offset[0], ship.y * V.followY + V.offset[1], ship.z + V.offset[2]);
  cam.up.set(...V.up);
  cam.lookAt(cam.position.x + V.dir[0], cam.position.y + V.dir[1], cam.position.z + V.dir[2]);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

describe("마우스 조준: 화면에서 가리킨 곳이 정말 그 월드 위치인가", () => {
  const rng = mulberry32(42);
  for (const view of ["chase", "high", "cockpit"] as ViewId[]) {
    it(`${view} 시점: 게이트 중심을 화면에 투영해 가리키면 중심이 그대로 나온다`, () => {
      for (let i = 0; i < 200; i++) {
        const ship = new THREE.Vector3((rng() - 0.5) * 24, (rng() - 0.5) * 16, rng() * 500);
        const gate = new THREE.Vector3((rng() - 0.5) * 16, (rng() - 0.5) * 10, ship.z + 30 + rng() * 100);
        const cam = cameraFor(view, ship);
        const ndc = gate.clone().project(cam); // 화면 좌표(-1..1)
        const out = new THREE.Vector3();
        expect(aimPointOnPlane(cam, { x: ndc.x, y: ndc.y }, gate.z, out)).toBe(true);
        expect(out.x).toBeCloseTo(gate.x, 4);
        expect(out.y).toBeCloseTo(gate.y, 4);
      }
    });
  }

  it("화면 오른쪽을 가리키면 SCREEN 오른쪽 방향(월드 -x)이 목표가 된다", () => {
    const ship = new THREE.Vector3(0, 0, 100);
    const cam = cameraFor("chase", ship);
    const left = new THREE.Vector3();
    const right = new THREE.Vector3();
    aimPointOnPlane(cam, { x: -0.5, y: 0 }, 160, left);
    aimPointOnPlane(cam, { x: 0.5, y: 0 }, 160, right);
    expect(right.x).toBeLessThan(left.x);
  });
});

function allFinite(...vals: number[]) {
  return vals.every((v) => Number.isFinite(v));
}

describe("시뮬레이션 견고성 (무작위 입력, 이상한 프레임 시간)", () => {
  it("어떤 입력을 줘도 NaN이 없고 값이 범위를 벗어나지 않는다", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = mulberry32(seed);
      const sim = createSim({ verticalSpeed: rng() * 10, horizontalSpeed: rng() * 10 }, mulberry32(seed * 31));
      for (let step = 0; step < 6000 && !sim.gameOver; step++) {
        const input: SimInput = {
          up: rng() < 0.3,
          down: rng() < 0.3,
          left: rng() < 0.3,
          right: rng() < 0.3,
          boost: rng() < 0.2,
          target: rng() < 0.5 ? { x: (rng() - 0.5) * 60, y: (rng() - 0.5) * 40 } : null,
        };
        sim.inertialControl = rng() < 0.9;
        // 프레임 시간도 들쭉날쭉: 아주 짧은 것부터 클램프 한계(0.05초)까지
        const dt = [1e-6, 1 / 240, 1 / 60, 1 / 30, 0.05][Math.floor(rng() * 5)];
        stepSim(sim, input, dt);
        expect(allFinite(sim.pos.x, sim.pos.y, sim.pos.z, sim.vel.x, sim.vel.y, sim.vel.z, sim.fuel, sim.mass)).toBe(true);
        expect(sim.fuel).toBeGreaterThanOrEqual(0);
        expect(sim.fuel).toBeLessThanOrEqual(C.FUEL_MAX);
        expect(sim.mass).toBeGreaterThanOrEqual(C.DRY_MASS - 1e-9);
        expect(sim.mass).toBeLessThanOrEqual(massFor(C.FUEL_MAX) + 1e-9);
        expect(Math.abs(sim.pos.x)).toBeLessThanOrEqual(C.PLAYFIELD_HALF_WIDTH + 1e-9);
        expect(Math.abs(sim.pos.y)).toBeLessThanOrEqual(C.PLAYFIELD_HALF_HEIGHT + 1e-9);
        expect(sim.vel.z).toBeGreaterThanOrEqual(C.MIN_FORWARD_SPEED - 1e-9);
        expect(sim.misses).toBeLessThanOrEqual(C.MAX_MISSES);
      }
    }
  });

  it("연료 0이면 그 순간 추력이 안 먹히지만, 기름이 나타나 다시 움직일 수 있다 (소프트락 없음)", () => {
    const sim = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(3));
    sim.inertialControl = false;
    sim.fuel = 0;
    stepSim(sim, { ...NO_INPUT, right: true, target: { x: 5, y: 5 } }, 1 / 60);
    expect(sim.vel.x).toBe(0);
    // 연료가 바닥나면 기름이 가까이에 생긴다
    expect(sim.world.oilItems.length).toBe(1);
    const oil = sim.world.oilItems[0];
    expect(Math.abs(oil.position.x - sim.pos.x)).toBeLessThanOrEqual(4.01);
    expect(Math.abs(oil.position.y - sim.pos.y)).toBeLessThanOrEqual(3.01);
  });
});

describe("에너지 보존: 여러 조건에서도 성립하는가", () => {
  it("힘·제동 없이 중력장을 지나가면 역학적 에너지 변화가 작다 (임의의 위치/속도, 중심 가까이 포함)", () => {
    const worst: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const rng = mulberry32(seed * 977);
      const sim = createSim({ verticalSpeed: 0, horizontalSpeed: 0 }, mulberry32(seed));
      sim.inertialControl = false;
      const f = sim.world.fields[0];
      // 중심 바로 옆(0.3 m)부터 가장자리(12 m)까지, 비스듬한 초기 속도
      const offset = 0.3 + rng() * 12;
      const angle = rng() * Math.PI * 2;
      sim.pos = { x: f.position.x + Math.cos(angle) * offset, y: f.position.y + Math.sin(angle) * offset, z: f.position.z - 25 };
      sim.vel = { x: (rng() - 0.5) * 6, y: (rng() - 0.5) * 6, z: 10 + rng() * 10 };
      const mech = () => kineticEnergy(sim) + potentialEnergy(sim);
      const e0 = mech();
      const ke0 = kineticEnergy(sim);
      let dev = 0;
      for (let i = 0; i < 4000; i++) {
        sim.fuel = C.FUEL_MAX; // 질량 변화 효과를 빼고 순수 중력만 본다
        sim.mass = massFor(sim.fuel);
        stepSim(sim, NO_INPUT, 1 / 1000);
        if (!sim.nearField) break;
        dev = Math.max(dev, Math.abs(mech() - e0) / ke0);
      }
      worst.push(dev);
    }
    worst.sort((a, b) => a - b);
    console.log(`에너지 변화율(운동에너지 대비) 중앙값 ${(worst[20] * 100).toFixed(2)}%, 최대 ${(worst[39] * 100).toFixed(2)}%`);
    expect(worst[39]).toBeLessThan(0.05);
  });
});
