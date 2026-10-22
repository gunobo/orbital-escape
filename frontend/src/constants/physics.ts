/**
 * 실제 만유인력 상수(G ≈ 6.674e-11)는 게임 규모에서 체감할 수 없을 만큼 작다.
 * F = G*M*m/r² 라는 구조는 그대로 두고, 게임에서 재미있게 느껴지도록
 * G와 M을 하나로 묶은 "표준중력변수"(mu = G*M)를 스케일링해서 사용한다.
 * (실제 천체역학에서도 mu를 직접 쓰는 것은 표준적인 방식이다.)
 */

export const PLAYFIELD_HALF_WIDTH = 14;
export const PLAYFIELD_HALF_HEIGHT = 10;

export const PLAYER_RADIUS = 0.9;
export const PLAYER_BASE_MASS = 1;
export const PLAYER_MASS_INCREMENT = 0.3;
export const PLAYER_MASS_MAX = 2.5;

/** 엔진이 내는 힘(F). 질량과 무관 — 무거워지면 같은 힘으로 가속도(a=F/m)가 줄어든다. */
export const BASE_THRUST_FORCE = 17;
export const BOOST_MULTIPLIER = 1.9;
/** 아케이드 조작감을 위한 횡방향 감쇠(현실 우주에는 마찰이 없지만, 학습용 조작성을 위한 보정) */
export const LATERAL_DAMPING_RATE = 0.8;

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
export const GRAVITY_FIELD_GATE_RADIUS = 4.0;
/** 특이점(분모가 0에 가까워지는 것) 방지용 최소 반경 */
export const GRAVITY_MIN_R = 5;

export const MAX_MISSES = 3;

export const FUEL_MAX = 100;
export const FUEL_DRAIN_IDLE = 1.5;
export const FUEL_DRAIN_THRUST = 4;
export const FUEL_DRAIN_BOOST_EXTRA = 6;
export const FUEL_REFILL_OIL = 70;
export const OIL_TRIGGER_THRESHOLD = 25;
export const OIL_SPAWN_COOLDOWN = 12;
export const OIL_ITEM_RADIUS = 2.0;
export const OIL_SPAWN_AHEAD_Z = 30;

export const SPAWN_AHEAD_Z = 150;
export const DESPAWN_BEHIND_Z = 12;
export const FIELD_FIRST_Z_MIN = 70;
export const FIELD_FIRST_Z_MAX = 100;
export const FIELD_SPAWN_INTERVAL_MIN = 55;
export const FIELD_SPAWN_INTERVAL_MAX = 85;
export const OBSTACLE_FIRST_Z = 60;
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

export const BEST_SCORE_KEY = "orbital-escape-best-score";
