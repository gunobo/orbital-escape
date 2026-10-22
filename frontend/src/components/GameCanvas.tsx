import { Canvas } from "@react-three/fiber";
import { FOG_FAR, FOG_NEAR, type ViewId } from "../constants/camera";
import type { GameOverReason, HudSnapshot, ObstacleSettings, RunSummary } from "../types";
import { COLORS } from "../constants/theme";
import Scene, { type ControlMode } from "./Scene";

interface Props {
  obstacleSettings: ObstacleSettings;
  view: ViewId;
  frozen: boolean;
  controlMode: ControlMode;
  inertialControl: boolean;
  showArrows: boolean;
  onHud: (hud: HudSnapshot) => void;
  onGameOver: (score: number, reason: GameOverReason, summary: RunSummary) => void;
}

export default function GameCanvas(props: Props) {
  return (
    <Canvas camera={{ fov: 62, near: 0.1, far: 500, position: [0, 3, -13] }}>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, FOG_NEAR, FOG_FAR]} />
      <Scene {...props} />
    </Canvas>
  );
}
