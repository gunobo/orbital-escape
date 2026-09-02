import { GRAVITY_MIN_R } from "../constants/physics";
import type { Vec3 } from "../types";

export function distance3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * 중력에 의해 "낙하하는 쪽"(플레이어)의 가속도는 a = G*M/r² 로,
 * 낙하하는 물체 자신의 질량과 무관하다 (등가원리 — 갈릴레오의 낙하 실험과 동일한 원리).
 * 우주선이 기름을 먹어 무거워져도 중력장에 "가속되는 정도"는 그대로다.
 */
export function gravityAccelToward(from: Vec3, to: Vec3, mu: number): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const rRaw = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (rRaw < 1e-6) return { x: 0, y: 0, z: 0 };
  const r = Math.max(rRaw, GRAVITY_MIN_R);
  const accelMag = mu / (r * r);
  return {
    x: (dx / rRaw) * accelMag,
    y: (dy / rRaw) * accelMag,
    z: (dz / rRaw) * accelMag,
  };
}
