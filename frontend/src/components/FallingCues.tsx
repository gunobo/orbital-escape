import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SimState } from "../systems/simulation";

/**
 * "아래로 떨어지는" 느낌을 주는 배경 장치. 게임 규칙에는 영향을 주지 않는다.
 * 시뮬레이션의 진행 축(+z)이 곧 "아래"이고, 기본 카메라(1인칭)는 발아래를 내려다본다.
 *  - 지면: 저 아래 땅이 계속 커지며 다가온다 (끝없는 확대: 두 겹을 엇갈려 섞어 이음매가 안 보인다)
 *  - 구름층: 일정 간격으로 놓인 구름을 뚫고 지나간다
 *  - 바람 줄무늬: 몸 곁을 위로 스쳐 지나가는 선. 빨리 떨어질수록 길어진다.
 */

const STREAK_COUNT = 160;
const STREAK_AHEAD = 170;
const STREAK_BEHIND = 12;
const STREAK_SPREAD_X = 42;
const STREAK_SPREAD_Y = 32;

/** 지면은 카메라 앞(아래) 이 거리에 늘 붙어 있고, 무늬만 커진다 */
const GROUND_DIST = 420;
const GROUND_SIZE = 1400;
/** 이만큼(m) 떨어질 때마다 땅 무늬가 2배로 커진다 */
const GROUND_ZOOM_PERIOD = 90;
const GROUND_REPEAT = 6;

const CLOUD_LAYERS = 4;
const CLOUD_LAYER_GAP = 120;
const CLOUD_PUFFS = 26;

function placeStreak(p: THREE.Vector3, baseZ: number, spanZ: number) {
  // 시야 한가운데는 비워 둬서 게이트·운석을 가리지 않게 한다
  for (;;) {
    p.x = (Math.random() * 2 - 1) * STREAK_SPREAD_X;
    p.y = (Math.random() * 2 - 1) * STREAK_SPREAD_Y;
    if (Math.abs(p.x) > 6 || Math.abs(p.y) > 5) break;
  }
  p.z = baseZ + Math.random() * spanZ;
}

/** 위에서 내려다본 땅: 어두운 바탕에 대륙 얼룩·강·격자 도로 */
function makeGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#151a20";
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 땅 얼룩 (가장자리에서 반대편으로 이어 그려 타일이 매끄럽게 이어진다)
  const blob = (x: number, y: number, r: number, color: string) => {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  };
  for (let i = 0; i < 40; i++) blob(rnd() * size, rnd() * size, 30 + rnd() * 90, i % 3 === 0 ? "rgba(70,84,72,0.45)" : "rgba(52,60,72,0.5)");
  for (let i = 0; i < 30; i++) blob(rnd() * size, rnd() * size, 6 + rnd() * 18, "rgba(150,140,110,0.25)");
  // 격자 (밭·도로): 다가오면서 커지는 게 잘 보인다
  g.strokeStyle = "rgba(170,180,195,0.16)";
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const v = (i / 8) * size;
    g.beginPath();
    g.moveTo(v, 0);
    g.lineTo(v, size);
    g.moveTo(0, v);
    g.lineTo(size, v);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makePuffTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export default function FallingCues({ sim }: { sim: SimState }) {
  const streaksRef = useRef<THREE.InstancedMesh>(null);
  const groundRef = useRef<THREE.Group>(null);
  const cloudRefs = useRef<(THREE.Object3D | null)[]>([]);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const positions = useMemo(() => {
    const list = Array.from({ length: STREAK_COUNT }, () => new THREE.Vector3());
    for (const p of list) placeStreak(p, -STREAK_BEHIND, STREAK_AHEAD + STREAK_BEHIND);
    return list;
  }, []);
  const tmp = useMemo(() => new THREE.Object3D(), []);

  // 지면 두 겹: 같은 무늬를 서로 반 주기 어긋나게 확대하고, 사라지는 쪽은 흐리게 섞는다
  const groundLayers = useMemo(() => {
    const base = makeGroundTexture();
    return [0, 1].map(() => {
      const tex = base.clone();
      tex.needsUpdate = true;
      return new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false });
    });
  }, []);

  const clouds = useMemo(() => {
    const map = makePuffTexture();
    return Array.from({ length: CLOUD_LAYERS }, (_, layer) => {
      const pts = new Float32Array(CLOUD_PUFFS * 3);
      for (let i = 0; i < CLOUD_PUFFS; i++) {
        let x = 0;
        let y = 0;
        do {
          x = (Math.random() * 2 - 1) * 70;
          y = (Math.random() * 2 - 1) * 52;
        } while (Math.abs(x) < 7 && Math.abs(y) < 6);
        pts[i * 3] = x;
        pts[i * 3 + 1] = y;
        pts[i * 3 + 2] = (Math.random() - 0.5) * 14;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      const mat = new THREE.PointsMaterial({
        map,
        size: 26,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.16,
        color: "#c7d0db",
        depthWrite: false,
      });
      return { geo, mat, z0: 60 + layer * CLOUD_LAYER_GAP };
    });
  }, []);

  useFrame(() => {
    const { pos, vel } = sim;

    const mesh = streaksRef.current;
    if (mesh) {
      const len = reduceMotion ? 0.6 : Math.max(0.6, vel.z * 0.3);
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

    const ground = groundRef.current;
    if (ground) {
      ground.position.set(pos.x * 0.6, pos.y * 0.6, pos.z + GROUND_DIST);
      const phase = pos.z / GROUND_ZOOM_PERIOD;
      groundLayers.forEach((mat, i) => {
        const t = (((phase + i * 0.5) % 1) + 1) % 1; // 0 → 1 동안 무늬가 2배로 커진다
        const repeat = GROUND_REPEAT * Math.pow(2, 1 - t);
        const tex = mat.map!;
        tex.repeat.set(repeat, repeat);
        // 화면 가운데(바로 아래)를 기준으로 커지게 한다. 좌우로 움직이면 땅이 살짝 반대로 흐른다
        tex.offset.set(0.5 - repeat / 2 + pos.x * 0.002 * repeat, 0.5 - repeat / 2 + pos.y * 0.002 * repeat);
        mat.opacity = Math.sin(Math.PI * t);
      });
    }

    clouds.forEach((c, i) => {
      const pts = cloudRefs.current[i];
      if (!pts) return;
      // 지나간 구름층은 맨 아래로 다시 보낸다
      while (c.z0 < pos.z - 20) c.z0 += CLOUD_LAYERS * CLOUD_LAYER_GAP;
      pts.position.set(0, 0, c.z0);
    });
  });

  return (
    <>
      <group ref={groundRef} renderOrder={-10}>
        {groundLayers.map((mat, i) => (
          <mesh key={i} material={mat} renderOrder={-10 + i} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
          </mesh>
        ))}
      </group>

      {clouds.map((c, i) => (
        <points
          key={i}
          ref={(el) => {
            cloudRefs.current[i] = el;
          }}
          geometry={c.geo}
          material={c.mat}
          frustumCulled={false}
        />
      ))}

      <instancedMesh ref={streaksRef} args={[undefined, undefined, STREAK_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.05, 1]} />
        <meshBasicMaterial color="#c9ced6" transparent opacity={0.4} />
      </instancedMesh>
    </>
  );
}
