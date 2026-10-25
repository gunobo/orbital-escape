/**
 * 실제 만유인력 상수(G ≈ 6.674e-11)는 게임 규모에서 체감할 수 없을 만큼 작다.
 * F = G*M*m/r² 라는 구조는 그대로 두고, 게임에서 재미있게 느껴지도록
 * G와 M을 하나로 묶은 "표준중력변수"(mu = G*M)를 스케일링해서 사용한다.
 * (실제 천체역학에서도 mu를 직접 쓰는 것은 표준적인 방식이다.)
 */

export const PLAYFIELD_HALF_WIDTH = 14;
export const PLAYFIELD_HALF_HEIGHT = 10;

export const PLAYER_RADIUS = 0.9;
/** 질량 = 건조 질량 + 연료 질량. 연료를 태우면 가벼워지고, 기름을 먹으면 무거워진다. */
export const DRY_MASS = 1;
export const FUEL_MASS_PER_UNIT = 0.006;

/** 엔진이 내는 힘(F). 질량과 무관 — 무거워지면 같은 힘으로 가속도(a=F/m)가 줄어든다. */
export const BASE_THRUST_FORCE = 17;
export const BOOST_MULTIPLIER = 1.9;
/** 마우스 조종: 목표 위치까지의 거리/속도에 비례해 가속도를 정한다 (PD 제어) */
export const STEER_KP = 2.2;
export const STEER_KD = 2.4;
/**
 * 관성 제어 장치(자동 제동): 우주에는 공기 저항이 없으므로 "공짜 감속"은 없다.
 * 대신 역추진으로 횡방향 속도를 줄이고, 줄어든 운동에너지만큼 연료를 쓴다(에너지 손실 = 배기·열).
 * 끄면(Z키) 뉴턴의 관성 법칙 그대로 미끄러지며 역학적 에너지가 보존된다.
 */
export const INERTIAL_BRAKE_RATE = 1.6;
/** 제동으로 없앤 운동에너지 1단위당 소모하는 연료 */
export const BRAKE_FUEL_PER_ENERGY = 0.02;

export const CRUISE_SPEED_BASE = 14;
export const CRUISE_SPEED_GAIN_PER_METER = 0.015;
export const CRUISE_SPEED_MAX = 22;
export const CRUISE_RESTORE_RATE = 0.6;
export const MIN_FORWARD_SPEED = 4;

export const GRAVITY_FIELD_MU_BASE = 420;
export const GRAVITY_FIELD_MU_GAIN_PER_METER = 0.25;
export const GRAVITY_FIELD_MU_MAX = 750;
export const GRAVITY_FIELD_DISPLAY_MASS = 5.4e4;
export const GRAVITY_FIELD_INFLUENCE_RADIUS = 26;
export const GRAVITY_FIELD_GATE_RADIUS = 5.0;
/** 특이점(분모가 0에 가까워지는 것) 방지용 최소 반경 */
export const GRAVITY_MIN_R = 5;

/** 목숨 3개: 게이트를 놓치거나 운석에 맞을 때마다 1개씩 잃고, 0개가 되면 끝난다 */
export const MAX_MISSES = 3;
/** 운석에 맞은 뒤 이 시간(초) 동안은 무적이라 겹쳐 있어도 목숨이 연달아 깎이지 않는다 */
export const HIT_INVULNERABLE_SEC = 1.5;
/** 게이트를 연속으로 이만큼 통과하면 미스가 1회 회복된다. 기획서 규칙(3회 누적)대로 기본은 0(회복 없음) */
export const MISS_RECOVER_STREAK = 0;

export const FUEL_MAX = 100;
export const FUEL_DRAIN_IDLE = 1;
export const FUEL_DRAIN_THRUST = 3;
export const FUEL_DRAIN_BOOST_EXTRA = 5;
export const FUEL_REFILL_OIL = 85;
export const OIL_TRIGGER_THRESHOLD = 25;
/** 기름을 놓쳐도 곧바로 다시 나온다 (이게 길면 한 번 놓친 기름이 사실상 탈락이 된다: 봇 실험으로 확인) */
export const OIL_SPAWN_COOLDOWN = 4;
export const OIL_ITEM_RADIUS = 2.0;
export const OIL_SPAWN_AHEAD_Z = 30;

export const SPAWN_AHEAD_Z = 200;
/** 중력 영향 반경(26)보다 커야 게이트를 지난 뒤에도 끝까지 당겨진다 */
export const DESPAWN_BEHIND_Z = 30;
export const FIELD_FIRST_Z_MIN = 70;
export const FIELD_FIRST_Z_MAX = 100;
export const FIELD_SPAWN_INTERVAL_MIN = 55;
export const FIELD_SPAWN_INTERVAL_MAX = 85;
export const OBSTACLE_FIRST_Z = 110;
/** 플레이어 현재 위치 근처를 노리고 날아오는 운석의 비율 */
export const OBSTACLE_AIM_PROB = 0.3;
/** 게이트 앞/뒤 이 거리(m) 안에는 운석을 소환하지 않는다 (정렬 구간 보호) */
export const OBSTACLE_GATE_CLEAR_BEFORE = 18;
export const OBSTACLE_GATE_CLEAR_AFTER = 4;
export const OBSTACLE_AREA_HALF_WIDTH = 12;
export const OBSTACLE_AREA_HALF_HEIGHT = 8;
export const OBSTACLE_SPAWN_INTERVAL_MIN = 20;
export const OBSTACLE_SPAWN_INTERVAL_MAX = 34;
export const OBSTACLE_RADIUS = 1.1;
/** 운석의 낙하 가속도(등가속도 운동). 게임 스케일을 위해 달 표면 중력(1.62 m/s²)을 쓴다. */
export const OBSTACLE_GRAVITY = 1.62;
/** 운석은 가까이 왔을 때 소환해야 도착 시간 예측이 정확하다 (게이트·중력장은 SPAWN_AHEAD_Z) */
export const OBSTACLE_SPAWN_AHEAD_Z = 90;

export const BEST_SCORE_KEY = "orbital-escape-best-score";
