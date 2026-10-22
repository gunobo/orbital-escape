import { Canvas } from "@react-three/fiber";
import type { GameOverReason, HudSnapshot, ObstacleSettings } from "../types";
import { FOG_FAR, FOG_NEAR } from "../constants/camera";
import Scene from "./Scene";

interface Props {
  obstacleSettings: ObstacleSettings;
  onHud: (hud: HudSnapshot) => void;
  onGameOver: (score: number, reason: GameOverReason) => void;
}

export default function GameCanvas({ obstacleSettings, onHud, onGameOver }: Props) {
  return (
    <Canvas camera={{ fov: 62, near: 0.1, far: 500, position: [0, 3, -13] }}>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", FOG_NEAR, FOG_FAR]} />
      <Scene obstacleSettings={obstacleSettings} onHud={onHud} onGameOver={onGameOver} />
    </Canvas>
  );
}
