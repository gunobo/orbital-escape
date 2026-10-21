import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Trail } from "@react-three/drei";
import * as THREE from "three";
import { useControls } from "../hooks/useControls";
import { clamp } from "../systems/physics";
import { createSim, score, stepSim } from "../systems/simulation";
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
      playerMeshRef.current.rotation.z = clamp(-vel.x * 0.05, -0.6, 0.6);
      playerMeshRef.current.rotation.x = clamp(vel.y * 0.04, -0.5, 0.5);
    }

    const camera = state.camera;
    camera.position.x += (pos.x * 0.5 - camera.position.x) * Math.min(1, dt * 4);
    camera.position.y += (pos.y * 0.5 + 3.2 - camera.position.y) * Math.min(1, dt * 4);
    camera.position.z = pos.z - 13;
    camera.lookAt(pos.x, pos.y, pos.z + 18);

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
        forwardSpeed: vel.z,
        lateralSpeed: Math.hypot(vel.x, vel.y),
        fieldInfo: sim.fieldInfo,
      });
    }
  });

  const lists = renderListsRef.current;

  return (
    <>
      <Stars radius={120} depth={60} count={3000} factor={3} fade speed={0.5} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 8, -6]} intensity={40} color="#8fd3ff" />
      <directionalLight position={[6, 10, 4]} intensity={0.6} />

      <Trail width={1.4} length={7} color="#5ad1ff" attenuation={(t) => t * t}>
        <mesh ref={playerMeshRef}>
          <coneGeometry args={[0.6, 1.8, 10]} />
          <meshStandardMaterial color="#e8f4ff" emissive="#3fa8ff" emissiveIntensity={0.5} />
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
