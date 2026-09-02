export type GamePhase = "settings" | "playing" | "gameover";

export type GameOverReason = "collision" | "gate-miss";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ObstacleSettings {
  /** 운석이 아래로 떨어지는 속도 (m/s) */
  verticalSpeed: number;
  /** 운석이 좌우로 흐르는 속도 (m/s) */
  horizontalSpeed: number;
}

export interface GravityFieldEntity {
  id: number;
  position: Vec3;
  /** 게임용으로 스케일된 표준중력변수 (mu = G*M) */
  mu: number;
  /** HUD 설명용 "행성" 질량 (임의 단위, 실제 물리 계산에는 mu만 사용) */
  displayMass: number;
  influenceRadius: number;
  gateRadius: number;
  resolved: boolean;
  passed: boolean;
}

export interface ObstacleEntity {
  id: number;
  position: Vec3;
  velocity: Vec3;
  radius: number;
}

export interface OilItemEntity {
  id: number;
  position: Vec3;
  radius: number;
  consumed: boolean;
}

export interface FieldInfo {
  playerAccel: number;
  fieldAccel: number;
  massRatio: number;
}

export interface HudSnapshot {
  scoreMeters: number;
  fuel: number;
  mass: number;
  misses: number;
  forwardSpeed: number;
  lateralSpeed: number;
  fieldInfo: FieldInfo | null;
}
