import * as THREE from "three";
import { ARROW_COLORS } from "../constants/theme";
import type { SimState } from "../systems/simulation";

export interface ForceArrows {
  gravity: THREE.ArrowHelper;
  reaction: THREE.ArrowHelper;
  thrust: THREE.ArrowHelper;
  velocity: THREE.ArrowHelper;
}

/** 힘 1단위당 화살표 길이(m). 힘이 클수록 화살표가 길다 */
const FORCE_SCALE = 0.35;
const FORCE_MAX = 9;
const VELOCITY_SCALE = 0.25;
const VELOCITY_MAX = 7;

function makeArrow(color: string): THREE.ArrowHelper {
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, color, 0.9, 0.55);
  for (const part of [arrow.line, arrow.cone]) {
    const material = part.material as THREE.Material;
    material.depthTest = false; // 다른 물체에 가려지지 않게
    material.transparent = true;
    part.renderOrder = 999;
  }
  arrow.visible = false;
  return arrow;
}

export function createForceArrows(): ForceArrows {
  return {
    gravity: makeArrow(ARROW_COLORS.gravity),
    reaction: makeArrow(ARROW_COLORS.reaction),
    thrust: makeArrow(ARROW_COLORS.thrust),
    velocity: makeArrow(ARROW_COLORS.velocity),
  };
}

const dir = new THREE.Vector3();

function place(
  arrow: THREE.ArrowHelper,
  origin: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
  scale: number,
  max: number,
  show: boolean,
): void {
  const mag = Math.hypot(v.x, v.y, v.z);
  const length = Math.min(mag * scale, max);
  if (!show || length < 0.3) {
    arrow.visible = false;
    return;
  }
  arrow.visible = true;
  arrow.position.set(origin.x, origin.y, origin.z);
  arrow.setDirection(dir.set(v.x, v.y, v.z).normalize());
  arrow.setLength(length, Math.min(1.2, length * 0.4), Math.min(0.7, length * 0.25));
}

/**
 * 화살표 = 힘. 길이는 힘의 크기에 비례한다.
 *  - 앰버: 행성이 나를 당기는 중력 F (질량 m에 비례)
 *  - 파랑: 내가 행성을 당기는 힘 (작용·반작용이라 앰버와 길이가 같고 방향이 반대)
 *  - 초록: 엔진이 내는 힘 (질량과 무관)
 *  - 흰색: 속도
 */
export function updateForceArrows(arrows: ForceArrows, sim: SimState, show: boolean): void {
  const { gravity, thrust } = sim.forces;
  const near = sim.nearField;
  place(arrows.gravity, sim.pos, gravity, FORCE_SCALE, FORCE_MAX, show && near !== null);
  if (near) {
    const dx = sim.pos.x - near.position.x;
    const dy = sim.pos.y - near.position.y;
    const dz = sim.pos.z - near.position.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const k = near.force / len;
    place(arrows.reaction, near.position, { x: dx * k, y: dy * k, z: dz * k }, FORCE_SCALE, FORCE_MAX, show);
  } else {
    arrows.reaction.visible = false;
  }
  place(arrows.thrust, sim.pos, thrust, FORCE_SCALE, FORCE_MAX, show);
  place(arrows.velocity, sim.pos, sim.vel, VELOCITY_SCALE, VELOCITY_MAX, show);
}
