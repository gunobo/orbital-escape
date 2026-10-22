import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Trail } from "@react-three/drei";
import * as THREE from "three";
import { VIEWS, type ViewId } from "../constants/camera";
import { BASE_THRUST_FORCE, BOOST_MULTIPLIER, PLAYFIELD_HALF_HEIGHT, PLAYFIELD_HALF_WIDTH } from "../constants/physics";
import { COLORS } from "../constants/theme";
import { useControls } from "../hooks/useControls";
import { clamp } from "../systems/physics";
import { createSim, nextGateGuide, physicsSnapshot, score, stepSim, type SimEvent, type SimInput, type SimState } from "../systems/simulation";
import { entityCount } from "../systems/spawner";
import type {
  GameOverReason,
  GravityFieldEntity,
  HudSnapshot,
  ObstacleEntity,
  ObstacleSettings,
  OilItemEntity,
  RunSummary,
} from "../types";
import { createForceArrows, updateForceArrows } from "./forceArrows";
import GravityFieldView from "./GravityFieldView";
import ObstacleView from "./ObstacleView";
import OilItemView from "./OilItemView";

export type ControlMode = "mouse" | "keyboard";

/** 마우스로 조준할 수 있는 시점 (위·옆에서는 화면과 월드 축이 달라 키보드만 쓴다) */
const MOUSE_VIEWS: ViewId[] = ["chase", "high", "cockpit"];

/** 부딪히거나 목숨이 다하면, 효과를 보여 준 뒤 결과 화면으로 넘어간다 (초) */
const END_DELAY = 0.8;
const MAX_EFFECTS = 6;

interface Effect {
  position: THREE.Vector3;
  color: string;
  age: number;
  life: number;
  fromScale: number;
  toScale: number;
}

interface SceneProps {
  obstacleSettings: ObstacleSettings;
  view: ViewId;
  /** 일시정지·카운트다운 중에는 시뮬레이션이 멈춘다 (시점 전환은 계속 된다) */
  frozen: boolean;
  controlMode: ControlMode;
  inertialControl: boolean;
  showArrows: boolean;
  onHud: (hud: HudSnapshot) => void;
  onGameOver: (score: number, reason: GameOverReason, summary: RunSummary) => void;
}

interface RenderLists {
  fields: GravityFieldEntity[];
  obstacles: ObstacleEntity[];
  oilItems: OilItemEntity[];
}

function summarize(sim: SimState): RunSummary {
  return {
    obstacle: sim.settings,
    maxGravAccel: sim.stats.maxGravAccel,
    maxGravAccelR: sim.stats.maxGravAccelR,
    minMass: sim.stats.minMass,
    maxMass: sim.stats.maxMass,
    oilPickups: sim.stats.oilPickups,
    gatesPassed: sim.stats.gatesPassed,
    gatesMissed: sim.stats.gatesMissed,
    timeInField: sim.stats.timeInField,
    engineWork: sim.energy.engine,
    brakeLoss: sim.energy.brake,
  };
}

/** 사건 → 퍼져 나가는 고리 효과. 어디서 무슨 일이 있었는지 알려 주는 용도다. */
function effectFor(e: SimEvent): Effect {
  const position = new THREE.Vector3(e.position.x, e.position.y, e.position.z);
  if (e.kind === "gate") {
    return { position, color: e.passed ? COLORS.ok : COLORS.danger, age: 0, life: 0.6, fromScale: e.radius, toScale: e.radius * 1.9 };
  }
  if (e.kind === "oil") {
    return { position, color: COLORS.accent, age: 0, life: 0.5, fromScale: 1, toScale: 4.5 };
  }
  return { position, color: COLORS.danger, age: 0, life: 0.8, fromScale: 1, toScale: 10 };
}

export default function Scene({
  obstacleSettings,
  view,
  frozen,
  controlMode,
  inertialControl,
  showArrows,
  onHud,
  onGameOver,
}: SceneProps) {
  const controlsRef = useControls();
  const [sim] = useState(() => createSim(obstacleSettings));
  const playerMeshRef = useRef<THREE.Mesh>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const skyRef = useRef<THREE.Group>(null);
  const targetMarkerRef = useRef<THREE.Mesh>(null);
  const effectMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const effects = useRef<Effect[]>([]);
  const arrows = useMemo(() => createForceArrows(), []);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // 콘의 뾰족한 끝이 진행 방향(+z)을 향하도록 미리 돌려둔다
  const shipGeometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.6, 1.8, 10);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  // 엔진 불꽃: 밑면이 우주선 뒤쪽에 붙고 뾰족한 끝이 뒤(-z)로 길어진다
  const flameGeometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.28, 1, 8);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -0.5);
    return g;
  }, []);

  // 프레임 루프는 React 렌더 밖에서 돌므로, 최신 props를 ref로 건네준다
  const live = useRef({ view, frozen, controlMode, inertialControl, showArrows });
  useEffect(() => {
    live.current = { view, frozen, controlMode, inertialControl, showArrows };
  });

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const aimPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const aimPoint = useMemo(() => new THREE.Vector3(), []);
  const lastTarget = useRef<{ x: number; y: number } | null>(null);
  const lastView = useRef<ViewId | null>(null);
  const camBase = useRef({ x: 0, y: 0 });
  const flameLen = useRef(0);
  const endTime = useRef<number | null>(null);

  const reportedRef = useRef(false);
  const hudAccumRef = useRef(0);
  const lastCountRef = useRef(-1);

  const [, forceRender] = useState(0);
  const renderListsRef = useRef<RenderLists>({ fields: [], obstacles: [], oilItems: [] });

  useFrame((state, rawDelta) => {
    const L = live.current;
    const dt = Math.min(rawDelta, 0.05);
    const camera = state.camera as THREE.PerspectiveCamera;
    const { pos, vel, world } = sim;
    const ending = endTime.current !== null;
    const running = !L.frozen && !reportedRef.current && !ending;

    // ── 1) 시뮬레이션 한 스텝 ───────────────────────────────
    let aimZ = pos.z + 45;
    if (running) {
      sim.inertialControl = L.inertialControl;
      const input: SimInput = { ...controlsRef.current, target: null };
      const keyboardActive = input.up || input.down || input.left || input.right;
      if (L.controlMode === "mouse" && MOUSE_VIEWS.includes(L.view) && !keyboardActive) {
        // 마우스 포인터가 가리키는 선(ray)과, 다음 게이트가 있는 깊이의 평면이 만나는 점이 목표
        const gate = world.fields.find((f) => !f.resolved && f.position.z > pos.z);
        aimZ = gate && gate.position.z - pos.z < 140 ? gate.position.z : pos.z + 45;
        aimPlane.constant = -aimZ;
        raycaster.setFromCamera(state.pointer, camera);
        if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) {
          lastTarget.current = {
            x: clamp(aimPoint.x, -PLAYFIELD_HALF_WIDTH, PLAYFIELD_HALF_WIDTH),
            y: clamp(aimPoint.y, -PLAYFIELD_HALF_HEIGHT, PLAYFIELD_HALF_HEIGHT),
          };
        }
        input.target = lastTarget.current;
      }
      stepSim(sim, input, dt);
    }

    // ── 2) 사건 → 효과 (게이트 통과/놓침, 기름, 충돌) ──────────
    for (const e of sim.events.splice(0)) {
      if (effects.current.length >= MAX_EFFECTS) effects.current.shift();
      effects.current.push(effectFor(e));
    }
    effects.current = effects.current.filter((fx) => (fx.age += dt) < fx.life);
    for (let i = 0; i < MAX_EFFECTS; i++) {
      const mesh = effectMeshes.current[i];
      const fx = effects.current[i];
      if (!mesh) continue;
      mesh.visible = !!fx && !reduceMotion;
      if (!fx || reduceMotion) continue;
      const t = fx.age / fx.life;
      const eased = 1 - (1 - t) * (1 - t); // 빠르게 퍼지다 천천히 멈춘다
      mesh.position.copy(fx.position);
      mesh.scale.setScalar(fx.fromScale + (fx.toScale - fx.fromScale) * eased);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(fx.color);
      mat.opacity = 1 - t;
    }

    // ── 3) 새로 생기거나 사라진 물체만 React에 반영 ────────────
    const count = entityCount(world);
    if (count !== lastCountRef.current) {
      lastCountRef.current = count;
      renderListsRef.current = {
        fields: [...world.fields],
        obstacles: [...world.obstacles],
        oilItems: [...world.oilItems],
      };
      forceRender((t) => t + 1);
    }

    // ── 4) 우주선·엔진 불꽃·조준점·힘 화살표 ───────────────────
    const mesh = playerMeshRef.current;
    if (mesh) {
      mesh.visible = L.view !== "cockpit";
      mesh.position.set(pos.x, pos.y, pos.z);
      // 움직이는 쪽으로 살짝 기울기만 한다 (좌: 반시계, 위: 기수 올림)
      mesh.rotation.z = clamp(-vel.x * 0.03, -0.3, 0.3);
      mesh.rotation.x = clamp(-vel.y * 0.02, -0.2, 0.2);
    }
    const flame = flameRef.current;
    if (flame) {
      // 엔진 힘이 클수록 불꽃이 길어진다 (힘이 보이는 피드백)
      const f = sim.forces.thrust;
      const target = (Math.hypot(f.x, f.y) / (BASE_THRUST_FORCE * BOOST_MULTIPLIER)) * 2.4;
      flameLen.current += (target - flameLen.current) * Math.min(1, dt * 12);
      flame.scale.set(1, 1, Math.max(0.001, flameLen.current));
      flame.visible = flameLen.current > 0.05 && !ending;
    }
    const marker = targetMarkerRef.current;
    if (marker) {
      const t = lastTarget.current;
      const showMarker = !!t && L.controlMode === "mouse" && MOUSE_VIEWS.includes(L.view) && !L.frozen && !ending;
      marker.visible = showMarker;
      if (showMarker && t) {
        marker.position.set(t.x, t.y, aimZ);
        marker.scale.setScalar(Math.max(1, (aimZ - camera.position.z) / 28)); // 멀어도 비슷한 크기로 보이게
      }
    }
    updateForceArrows(arrows, sim, L.showArrows && L.view !== "cockpit");

    // ── 5) 카메라: 시점마다 고정된 방향을 보고 평행이동만 한다 ─────
    const V = VIEWS[L.view];
    const cx = pos.x * V.followX + V.offset[0];
    const cy = pos.y * V.followY + V.offset[1];
    const cz = pos.z + V.offset[2];
    if (lastView.current !== L.view) {
      lastView.current = L.view;
      camBase.current = { x: cx, y: cy };
      camera.fov = V.fov;
      camera.updateProjectionMatrix();
    } else {
      const follow = Math.min(1, dt * 5);
      camBase.current.x += (cx - camBase.current.x) * follow;
      camBase.current.y += (cy - camBase.current.y) * follow;
    }
    // 충돌하면 화면이 잠깐 흔들렸다가 가라앉는다
    let shakeX = 0;
    let shakeY = 0;
    if (endTime.current !== null && !reduceMotion) {
      const amp = 0.5 * Math.max(0, 1 - endTime.current / END_DELAY) * (sim.gameOver === "collision" ? 1 : 0.3);
      shakeX = (Math.random() - 0.5) * amp;
      shakeY = (Math.random() - 0.5) * amp;
    }
    camera.position.set(camBase.current.x + shakeX, camBase.current.y + shakeY, cz);
    camera.up.set(V.up[0], V.up[1], V.up[2]);
    camera.lookAt(camera.position.x + V.dir[0], camera.position.y + V.dir[1], camera.position.z + V.dir[2]);
    // 별은 카메라를 따라다니는 배경으로 두어 멀어지거나 스쳐 지나가지 않게 한다
    skyRef.current?.position.copy(camera.position);

    // ── 6) 게임 종료: 효과를 잠깐 보여 준 뒤 결과 화면으로 ────────
    if (sim.gameOver && endTime.current === null) endTime.current = 0;
    if (endTime.current !== null && !reportedRef.current) {
      endTime.current += dt;
      if (endTime.current >= END_DELAY || reduceMotion) {
        reportedRef.current = true;
        onGameOver(score(sim), sim.gameOver ?? "collision", summarize(sim));
      }
      return;
    }
    if (!running) return;

    hudAccumRef.current += dt;
    if (hudAccumRef.current >= 0.1) {
      hudAccumRef.current = 0;
      onHud({
        scoreMeters: score(sim),
        fuel: sim.fuel,
        mass: sim.mass,
        misses: sim.misses,
        streak: sim.streak,
        gate: nextGateGuide(sim),
        physics: physicsSnapshot(sim),
      });
    }
  });

  const lists = renderListsRef.current;

  return (
    <>
      <group ref={skyRef}>
        <Stars radius={100} depth={50} count={2500} factor={3} fade speed={0} />
      </group>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 8, -6]} intensity={40} color="#ffffff" />
      <directionalLight position={[6, 10, 4]} intensity={0.6} />

      <Trail width={1} length={24} color={COLORS.velocity} attenuation={(t) => t * t}>
        <mesh ref={playerMeshRef} geometry={shipGeometry}>
          <meshStandardMaterial color="#d9dbde" emissive="#6b6f76" emissiveIntensity={0.35} />
          <mesh position={[0, 0, -0.35]}>
            <boxGeometry args={[2.2, 0.06, 0.6]} />
            <meshStandardMaterial color="#a9adb4" emissive="#6b6f76" emissiveIntensity={0.25} />
          </mesh>
          <mesh ref={flameRef} geometry={flameGeometry} position={[0, 0, -0.9]} visible={false}>
            <meshBasicMaterial color={COLORS.accent} />
          </mesh>
        </mesh>
      </Trail>

      {/* 마우스 조준점 */}
      <mesh ref={targetMarkerRef} visible={false} renderOrder={998}>
        <torusGeometry args={[1, 0.08, 8, 32]} />
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.9} depthTest={false} />
      </mesh>

      {/* 사건 효과용 고리 (미리 만들어 두고 재사용) */}
      {Array.from({ length: MAX_EFFECTS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            effectMeshes.current[i] = el;
          }}
          visible={false}
          renderOrder={997}
        >
          <torusGeometry args={[1, 0.07, 8, 48]} />
          <meshBasicMaterial transparent depthTest={false} />
        </mesh>
      ))}

      <primitive object={arrows.gravity} />
      <primitive object={arrows.reaction} />
      <primitive object={arrows.thrust} />
      <primitive object={arrows.velocity} />

      {lists.fields.map((field) => (
        <GravityFieldView key={field.id} data={field} />
      ))}
      {lists.obstacles.map((obstacle) => (
        <ObstacleView key={obstacle.id} data={obstacle} />
      ))}
      {lists.oilItems.map((item) => (
        <OilItemView key={item.id} data={item} />
      ))}
    </>
  );
}
