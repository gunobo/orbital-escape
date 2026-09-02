import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Trail } from "@react-three/drei";
import * as THREE from "three";
import * as C from "../constants/physics";
import { useControls } from "../hooks/useControls";
import { clamp, distance3, gravityAccelToward } from "../systems/physics";
import {
  createWorldState,
  despawnBehind,
  entityCount,
  maybeSpawnOil,
  spawnFields,
  spawnObstacles,
  stepObstacles,
  type WorldState,
} from "../systems/spawner";
import type { GameOverReason, GravityFieldEntity, HudSnapshot, ObstacleEntity, ObstacleSettings, OilItemEntity, Vec3 } from "../types";
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
  const worldRef = useRef<WorldState>(createWorldState());
  const playerMeshRef = useRef<THREE.Mesh>(null);

  const posRef = useRef<Vec3>({ x: 0, y: 0, z: 0 });
  const velRef = useRef<Vec3>({ x: 0, y: 0, z: C.CRUISE_SPEED_BASE });
  const fuelRef = useRef(C.FUEL_MAX);
  const massRef = useRef(C.PLAYER_BASE_MASS);
  const missesRef = useRef(0);
  const elapsedRef = useRef(0);
  const gameOverRef = useRef(false);
  const hudAccumRef = useRef(0);
  const lastCountRef = useRef(0);

  const [, forceRender] = useState(0);
  const renderListsRef = useRef<RenderLists>({ fields: [], obstacles: [], oilItems: [] });

  const finishGame = (reason: GameOverReason) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    onGameOver(Math.floor(posRef.current.z), reason);
  };

  useFrame((state, rawDelta) => {
    if (gameOverRef.current) return;
    const dt = Math.min(rawDelta, 0.05);
    elapsedRef.current += dt;
    const world = worldRef.current;
    const pos = posRef.current;
    const vel = velRef.current;

    let ax = 0;
    let ay = 0;
    let az = 0;
    let fieldInfo: HudSnapshot["fieldInfo"] = null;

    for (const field of world.fields) {
      if (field.resolved) continue;
      const d = distance3(pos, field.position);
      if (d <= field.influenceRadius) {
        const a = gravityAccelToward(pos, field.position, field.mu);
        ax += a.x;
        ay += a.y;
        az += a.z;
        const playerAccel = Math.hypot(a.x, a.y, a.z);
        const r = Math.max(d, C.GRAVITY_MIN_R);
        const fieldG = field.mu / field.displayMass;
        const fieldAccel = (fieldG * massRef.current) / (r * r);
        fieldInfo = {
          playerAccel,
          fieldAccel,
          massRatio: field.displayMass / massRef.current,
        };
      }
    }

    const ctrl = controlsRef.current;
    let tx = 0;
    let ty = 0;
    if (ctrl.left) tx -= 1;
    if (ctrl.right) tx += 1;
    if (ctrl.up) ty += 1;
    if (ctrl.down) ty -= 1;
    const thrustMag = Math.hypot(tx, ty);
    let thrustFuelUse = 0;
    if (thrustMag > 0 && fuelRef.current > 0) {
      const invMag = 1 / thrustMag;
      const boostMul = ctrl.boost ? C.BOOST_MULTIPLIER : 1;
      const accelMag = (C.BASE_THRUST_FORCE * boostMul) / massRef.current;
      ax += tx * invMag * accelMag;
      ay += ty * invMag * accelMag;
      thrustFuelUse = C.FUEL_DRAIN_THRUST + (ctrl.boost ? C.FUEL_DRAIN_BOOST_EXTRA : 0);
    }
    fuelRef.current = clamp(fuelRef.current - (C.FUEL_DRAIN_IDLE + thrustFuelUse) * dt, 0, C.FUEL_MAX);

    vel.x += ax * dt;
    vel.y += ay * dt;
    vel.z += az * dt;

    const dampFactor = Math.max(0, 1 - C.LATERAL_DAMPING_RATE * dt);
    vel.x *= dampFactor;
    vel.y *= dampFactor;

    const cruiseTarget = Math.min(
      C.CRUISE_SPEED_BASE + pos.z * C.CRUISE_SPEED_GAIN_PER_METER,
      C.CRUISE_SPEED_MAX,
    );
    vel.z += (cruiseTarget - vel.z) * C.CRUISE_RESTORE_RATE * dt;
    vel.z = Math.max(C.MIN_FORWARD_SPEED, vel.z);

    pos.x = clamp(pos.x + vel.x * dt, -C.PLAYFIELD_HALF_WIDTH, C.PLAYFIELD_HALF_WIDTH);
    pos.y = clamp(pos.y + vel.y * dt, -C.PLAYFIELD_HALF_HEIGHT, C.PLAYFIELD_HALF_HEIGHT);
    pos.z += vel.z * dt;

    for (const field of world.fields) {
      if (!field.resolved && pos.z >= field.position.z) {
        const dx = pos.x - field.position.x;
        const dy = pos.y - field.position.y;
        const lateralDist = Math.hypot(dx, dy);
        field.passed = lateralDist <= field.gateRadius;
        field.resolved = true;
        if (!field.passed) {
          missesRef.current += 1;
          if (missesRef.current >= C.MAX_MISSES) {
            finishGame("gate-miss");
          }
        }
      }
    }

    stepObstacles(world, dt);

    for (const obstacle of world.obstacles) {
      if (distance3(pos, obstacle.position) <= C.PLAYER_RADIUS + obstacle.radius) {
        finishGame("collision");
        break;
      }
    }

    for (const item of world.oilItems) {
      if (item.consumed) continue;
      if (distance3(pos, item.position) <= C.PLAYER_RADIUS + item.radius) {
        item.consumed = true;
        world.oilActive = false;
        fuelRef.current = clamp(fuelRef.current + C.FUEL_REFILL_OIL, 0, C.FUEL_MAX);
        massRef.current = clamp(massRef.current + C.PLAYER_MASS_INCREMENT, C.PLAYER_BASE_MASS, C.PLAYER_MASS_MAX);
      }
    }

    if (gameOverRef.current) return;

    spawnFields(world, pos.z);
    spawnObstacles(world, pos.z, obstacleSettings);
    maybeSpawnOil(world, pos.z, fuelRef.current, elapsedRef.current);
    despawnBehind(world, pos.z);

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
    const camTargetX = pos.x * 0.5;
    const camTargetY = pos.y * 0.5 + 3.2;
    const camTargetZ = pos.z - 13;
    camera.position.x += (camTargetX - camera.position.x) * Math.min(1, dt * 4);
    camera.position.y += (camTargetY - camera.position.y) * Math.min(1, dt * 4);
    camera.position.z = camTargetZ;
    camera.lookAt(pos.x, pos.y, pos.z + 18);

    hudAccumRef.current += dt;
    if (hudAccumRef.current >= 0.1) {
      hudAccumRef.current = 0;
      onHud({
        scoreMeters: Math.floor(pos.z),
        fuel: fuelRef.current,
        mass: massRef.current,
        misses: missesRef.current,
        forwardSpeed: vel.z,
        lateralSpeed: Math.hypot(vel.x, vel.y),
        fieldInfo,
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
