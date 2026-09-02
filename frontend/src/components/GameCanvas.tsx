import { Canvas } from "@react-three/fiber";
import type { GameOverReason, HudSnapshot, ObstacleSettings } from "../types";
import Scene from "./Scene";

interface Props {
  obstacleSettings: ObstacleSettings;
  onHud: (hud: HudSnapshot) => void;
  onGameOver: (score: number, reason: GameOverReason) => void;
}

export default function GameCanvas({ obstacleSettings, onHud, onGameOver }: Props) {
  return (
    <Canvas camera={{ fov: 62, near: 0.1, far: 400, position: [0, 3, -13] }}>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 40, 170]} />
      <Scene obstacleSettings={obstacleSettings} onHud={onHud} onGameOver={onGameOver} />
    </Canvas>
  );
}
