import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SimState } from "../systems/simulation";

/**
 * "아래로 떨어지는" 느낌을 주는 배경 장치. 게임 규칙에는 영향을 주지 않는다.
 * 시뮬레이션의 진행 축(+z)이 곧 "아래"이고, 카메라는 우주선 위에서 그 방향을 내려다본다.
 *  - 바람 줄무늬: 우주선 곁을 위로 스쳐 지나가는 선. 빨리 떨어질수록 길어진다.
 *  - 아래쪽 행성: 저 아래 지면. 떨어질수록 조금씩 가까워진다.
 */

const STREAK_COUNT = 140;
const STREAK_AHEAD = 170;
const STREAK_BEHIND = 12;
const STREAK_SPREAD_X = 42;
const STREAK_SPREAD_Y = 32;

/** 행성 중심까지의 거리(m): 처음엔 멀고, 떨어질수록 MIN 까지 가까워진다 */
const PLANET_DIST_START = 470;
const PLANET_DIST_MIN = 300;
const PLANET_APPROACH_PER_METER = 0.04;
const PLANET_RADIUS = 190;

function placeStreak(p: THREE.Vector3, baseZ: number, spanZ: number) {
  // 우주선 바로 앞(시야 한가운데)은 비워 둬서 게이트·운석을 가리지 않게 한다
  for (;;) {
    p.x = (Math.random() * 2 - 1) * STREAK_SPREAD_X;
    p.y = (Math.random() * 2 - 1) * STREAK_SPREAD_Y;
    if (Math.abs(p.x) > 9 || Math.abs(p.y) > 7) break;
  }
  p.z = baseZ + Math.random() * spanZ;
}

export default function FallingCues({ sim }: { sim: SimState }) {
  const streaksRef = useRef<THREE.InstancedMesh>(null);
  const planetRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const list = Array.from({ length: STREAK_COUNT }, () => new THREE.Vector3());
    for (const p of list) placeStreak(p, -STREAK_BEHIND, STREAK_AHEAD + STREAK_BEHIND);
    return list;
  }, []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useFrame(() => {
    const { pos, vel } = sim;
    const mesh = streaksRef.current;
    if (mesh) {
      // 속도가 빠를수록 줄무늬가 길어진다 (움직임 연출을 줄이는 설정이면 짧게만)
      const len = reduceMotion ? 0.6 : Math.max(0.6, vel.z * 0.22);
      for (let i = 0; i < STREAK_COUNT; i++) {
        const p = positions[i];
        if (p.z < pos.z - STREAK_BEHIND) placeStreak(p, pos.z + STREAK_AHEAD * 0.6, STREAK_AHEAD * 0.4);
        tmp.position.copy(p);
        tmp.scale.set(1, 1, len);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    const planet = planetRef.current;
    if (planet) {
      const dist = Math.max(PLANET_DIST_MIN, PLANET_DIST_START - pos.z * PLANET_APPROACH_PER_METER);
      planet.position.set(0, 0, pos.z + dist + PLANET_RADIUS * 0.15);
      planet.rotation.z = pos.z * 0.0004; // 아주 천천히 돌아서 표면 무늬가 흐른다
    }
  });

  return (
    <>
      <instancedMesh ref={streaksRef} args={[undefined, undefined, STREAK_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.05, 1]} />
        <meshBasicMaterial color="#c9ced6" transparent opacity={0.35} />
      </instancedMesh>

      <group ref={planetRef}>
        <mesh>
          <sphereGeometry args={[PLANET_RADIUS, 48, 32]} />
          <meshStandardMaterial color="#232a33" emissive="#141a21" emissiveIntensity={1} roughness={1} fog={false} />
        </mesh>
        {/* 위도선: 표면이 다가오는 게 보이도록 */}
        <mesh>
          <sphereGeometry args={[PLANET_RADIUS * 1.002, 24, 12]} />
          <meshBasicMaterial color="#3a4450" wireframe transparent opacity={0.35} fog={false} />
        </mesh>
        {/* 대기 테두리 */}
        <mesh>
          <sphereGeometry args={[PLANET_RADIUS * 1.06, 48, 32]} />
          <meshBasicMaterial color="#5b6b80" transparent opacity={0.12} side={THREE.BackSide} fog={false} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}
