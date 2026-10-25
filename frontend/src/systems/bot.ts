import { SCREEN_RIGHT_X } from "../constants/camera";
import { NO_INPUT, type SimInput, type SimState } from "./simulation";
import type { Rng } from "./spawner";

export interface BotProfile {
  name: string;
  /** 판단 주기(초) — 사람의 반응속도 */
  reaction: number;
  /** 판단마다 입력이 틀어질 확률 */
  noise: number;
  /** 위협이 가까울 때 부스트를 쓰는지 */
  boost: boolean;
  /** 이 거리(m) 안의 운석만 본다 */
  lookahead: number;
  /** 아이템/게이트를 보고 움직이는지 (false면 가만히 있음) */
  active: boolean;
  /** 마우스 조종: 키 대신 "가고 싶은 위치"를 지정한다 (jitter: 조준이 흔들리는 정도, m) */
  pointer?: { jitter: number };
}

export const PROFILES: BotProfile[] = [
  { name: "idle", reaction: 1, noise: 0, boost: false, lookahead: 0, active: false },
  { name: "novice", reaction: 0.4, noise: 0.2, boost: false, lookahead: 30, active: true },
  { name: "average", reaction: 0.25, noise: 0.08, boost: true, lookahead: 40, active: true },
  { name: "skilled", reaction: 0.12, noise: 0.02, boost: true, lookahead: 55, active: true },
  // 마우스 조종 (사람이 마우스로 하는 것에 가깝게: 반응 지연 + 조준 흔들림)
  { name: "mouse-novice", reaction: 0.4, noise: 0, boost: false, lookahead: 30, active: true, pointer: { jitter: 2.5 } },
  { name: "mouse-average", reaction: 0.25, noise: 0, boost: false, lookahead: 40, active: true, pointer: { jitter: 1.2 } },
  { name: "mouse-skilled", reaction: 0.12, noise: 0, boost: false, lookahead: 55, active: true, pointer: { jitter: 0.4 } },
];

/**
 * 사람처럼 "일정 주기로" 판단하는 간단한 봇.
 * 우선순위: 운석 회피 > 기름 아이템(연료 부족 시) > 다음 중력장 게이트 중심 > 화면 중앙 대기
 */
export function createBot(profile: BotProfile, rng: Rng) {
  let timer = 0;
  let current: SimInput = NO_INPUT;

  const decide = (sim: SimState): SimInput => {
    if (!profile.active) return NO_INPUT;
    const { pos, vel, world } = sim;

    let tx = 0;
    let ty = 0;
    let urgent = false;

    const field = world.fields.find((f) => !f.resolved && f.position.z > pos.z);
    if (field && field.position.z - pos.z < 70) {
      tx = field.position.x;
      ty = field.position.y;
    }

    const oil = world.oilItems.find((o) => !o.consumed && o.position.z > pos.z);
    if (oil) {
      tx = oil.position.x;
      ty = oil.position.y;
    }

    let threat: { dx: number; dy: number; eta: number } | null = null;
    for (const o of world.obstacles) {
      const dz = o.position.z - pos.z;
      if (dz < 0 || dz > profile.lookahead) continue;
      const eta = dz / Math.max(vel.z, 1);
      const px = o.position.x + o.velocity.x * eta;
      const py = o.position.y + o.velocity.y * eta;
      const ex = pos.x + vel.x * eta * 0.5;
      const ey = pos.y + vel.y * eta * 0.5;
      const dist = Math.hypot(px - ex, py - ey);
      if (dist < 4.2 && (!threat || eta < threat.eta)) {
        threat = { dx: ex - px, dy: ey - py, eta };
      }
    }
    if (threat) {
      const len = Math.hypot(threat.dx, threat.dy) || 1;
      tx = pos.x + (threat.dx / len) * 6;
      ty = pos.y + (threat.dy / len) * 6;
      urgent = threat.eta < 1.0;
    }

    if (profile.pointer) {
      const j = profile.pointer.jitter;
      return {
        ...NO_INPUT,
        boost: profile.boost && urgent,
        target: { x: tx + (rng() - 0.5) * 2 * j, y: ty + (rng() - 0.5) * 2 * j },
      };
    }

    // PD 제어: 목표 위치로 가되 속도를 죽인다
    const ax = 2.0 * (tx - pos.x) - 1.6 * vel.x;
    const ay = 2.0 * (ty - pos.y) - 1.6 * vel.y;
    const dead = 3;
    const input: SimInput = {
      left: ax * SCREEN_RIGHT_X < -dead,
      right: ax * SCREEN_RIGHT_X > dead,
      down: ay < -dead,
      up: ay > dead,
      boost: profile.boost && urgent,
    };
    if (rng() < profile.noise) {
      input.left = rng() < 0.5;
      input.right = rng() < 0.5;
      input.up = rng() < 0.5;
      input.down = rng() < 0.5;
    }
    return input;
  };

  return (sim: SimState, dt: number): SimInput => {
    timer -= dt;
    if (timer <= 0) {
      timer = profile.reaction;
      current = decide(sim);
    }
    return current;
  };
}
