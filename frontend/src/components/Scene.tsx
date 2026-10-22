import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Trail } from "@react-three/drei";
import * as THREE from "three";
import {
  CAMERA_BACK,
  CAMERA_FOLLOW,
  CAMERA_HEIGHT,
  CAMERA_PITCH_DOWN,
  CAMERA_YAW,
} from "../constants/camera";
import { useControls } from "../hooks/useControls";
import { clamp } from "../systems/physics";
import { createSim, nextGateGuide, score, stepSim } from "../systems/simulation";
import { entityCount } from "../systems/spawner";
import type { GameOverReason, GravityFieldEntity, HudSnapshot, ObstacleEntity, ObstacleSettings, OilItemEntity } from "../types";
import GravityFieldView from "./GravityFieldView";
import ObstacleView from "./ObstacleView";
import OilItemView from "./OilItemView";

interface SceneProps {
  obstacleSettings: ObstacleSettings;
  onHud: (hud: HudSnapshot) => void;
  onGameOver: (score: number, reason: GameOverReason) => void;
}

interface RenderLists {
  fields: GravityFieldEntity[];
  obstacles: ObstacleEntity[];
  oilItems: OilItemEntity[];
}

export default function Scene({ obstacleSettings, onHud, onGameOver }: SceneProps) {
  const controlsRef = useControls();
  const [sim] = useState(() => createSim(obstacleSettings));
  const playerMeshRef = useRef<THREE.Mesh>(null);
  const skyRef = useRef<THREE.Group>(null);
  // 콘의 뾰족한 끝이 진행 방향(+z)을 향하도록 미리 돌려둔다
  const shipGeometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.6, 1.8, 10);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  const reportedRef = useRef(false);
  const hudAccumRef = useRef(0);
  const lastCountRef = useRef(-1);

  const [, forceRender] = useState(0);
  const renderListsRef = useRef<RenderLists>({ fields: [], obstacles: [], oilItems: [] });

  useFrame((state, rawDelta) => {
    if (reportedRef.current) return;
    const dt = Math.min(rawDelta, 0.05);
    stepSim(sim, controlsRef.current, dt);

    const { pos, vel, world } = sim;

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

    if (playerMeshRef.current) {
      playerMeshRef.current.position.set(pos.x, pos.y, pos.z);
      // 움직이는 쪽으로 살짝 기울기만 한다 (좌: 반시계, 위: 기수 올림)
      playerMeshRef.current.rotation.z = clamp(-vel.x * 0.03, -0.3, 0.3);
      playerMeshRef.current.rotation.x = clamp(-vel.y * 0.02, -0.2, 0.2);
    }

    const camera = state.camera;
    const follow = Math.min(1, dt * 4);
    camera.position.x += (pos.x * CAMERA_FOLLOW - camera.position.x) * follow;
    camera.position.y += (pos.y * CAMERA_FOLLOW + CAMERA_HEIGHT - camera.position.y) * follow;
    camera.position.z = pos.z - CAMERA_BACK;
    // lookAt 으로 플레이어를 쫓아 회전하지 않고, 항상 정면만 본다 (멀미 방지)
    camera.rotation.set(CAMERA_PITCH_DOWN, CAMERA_YAW, 0);
    // 별은 카메라를 따라다니는 배경으로 두어 멀어지거나 스쳐 지나가지 않게 한다
    skyRef.current?.position.copy(camera.position);

    if (sim.gameOver) {
      reportedRef.current = true;
      onGameOver(score(sim), sim.gameOver);
      return;
    }

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
        forwardSpeed: vel.z,
        lateralSpeed: Math.hypot(vel.x, vel.y),
        fieldInfo: sim.fieldInfo,
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
      <pointLight position={[0, 8, -6]} intensity={40} color="#8fd3ff" />
      <directionalLight position={[6, 10, 4]} intensity={0.6} />

      <Trail width={1.4} length={7} color="#5ad1ff" attenuation={(t) => t * t}>
        <mesh ref={playerMeshRef} geometry={shipGeometry}>
          <meshStandardMaterial color="#e8f4ff" emissive="#3fa8ff" emissiveIntensity={0.5} />
          <mesh position={[0, 0, -0.35]}>
            <boxGeometry args={[2.2, 0.06, 0.6]} />
            <meshStandardMaterial color="#9fc8ff" emissive="#3fa8ff" emissiveIntensity={0.3} />
          </mesh>
        </mesh>
      </Trail>

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
