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
  /** 수평(x)은 일정, 수직(y)은 중력 가속도로 변한다 — 두 운동은 서로 독립 */
  velocity: Vec3;
  radius: number;
  /** 소환된 뒤 흐른 시간(초) — 나타날 때 서서히 커지는 연출용 */
  age: number;
}

export interface OilItemEntity {
  id: number;
  position: Vec3;
  radius: number;
  consumed: boolean;
}

/** 가장 가까운 중력장과 나 사이의 힘 (뉴턴 제3법칙: 같은 크기의 힘이 서로를 당긴다) */
export interface NearFieldSnapshot {
  /** 나와 행성 중심 사이의 거리(m) */
  r: number;
  mu: number;
  planetMass: number;
  /** 만유인력 F = G·M·m / r² (나와 행성이 서로 받는 힘, 같은 크기) */
  force: number;
  aMe: number;
  aPlanet: number;
  massRatio: number;
  influenceRadius: number;
}

export interface PhysicsSnapshot {
  mass: number;
  inertialControl: boolean;
  field: NearFieldSnapshot | null;
  /** 수평(진행) 속도 — 거의 일정 */
  vForward: number;
  /** 수직(위+) 속도 — 중력·추력으로 변한다 */
  vUp: number;
  /** 좌우(화면 오른쪽+) 속도 */
  vRight: number;
  thrustForce: number;
  thrustAccel: number;
  /** 운동에너지 ½mv² */
  ke: number;
  /** 중력 퍼텐셜 에너지 (중력장 밖에서는 0) */
  pe: number;
  /** 엔진이 해 준 일 (누적) */
  engineWork: number;
  /** 제동으로 손실된 에너지 (누적) */
  brakeLoss: number;
}

export interface GateGuideSnapshot {
  distance: number;
  right: number;
  up: number;
  gateRadius: number;
  aligned: boolean;
}

export interface HudSnapshot {
  scoreMeters: number;
  fuel: number;
  mass: number;
  misses: number;
  streak: number;
  gate: GateGuideSnapshot | null;
  physics: PhysicsSnapshot;
}

/** 한 판이 끝났을 때 "이번 판에서 어떤 물리를 겪었는지" 정리한 값 (학습 요약·퀴즈용) */
export interface RunSummary {
  obstacle: ObstacleSettings;
  maxGravAccel: number;
  maxGravAccelR: number;
  minMass: number;
  maxMass: number;
  oilPickups: number;
  gatesPassed: number;
  gatesMissed: number;
  timeInField: number;
  /** 엔진이 해 준 일 / 제동으로 손실된 에너지 (누적) */
  engineWork: number;
  brakeLoss: number;
}
