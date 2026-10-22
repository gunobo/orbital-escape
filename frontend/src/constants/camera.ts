/**
 * 카메라는 항상 월드 +z(진행 방향)만 바라보고 회전하지 않는다 (평행이동만 한다).
 * 카메라가 움직이는 물체를 따라 회전하면 화면 전체가 흔들려 멀미가 나기 쉽다.
 */
export const CAMERA_YAW = Math.PI;

/**
 * +z를 바라보는 카메라에서는 화면 오른쪽이 월드 -x 이다.
 * 입력 "오른쪽"이 화면 오른쪽으로 움직이도록 시뮬레이션이 이 값을 곱해서 쓴다.
 * (카메라 방향과 같은 상수에서 계산하므로 서로 어긋날 수 없다.)
 */
export const SCREEN_RIGHT_X = Math.round(Math.cos(CAMERA_YAW));

/** 안개: 멀리(약 150m 앞)에서부터 게이트/운석이 보이되, 소환 지점(SPAWN_AHEAD_Z)은 안개 속에 가려지게 한다 */
export const FOG_NEAR = 70;
export const FOG_FAR = 210;

export type ViewId = "chase" | "high" | "top" | "side" | "cockpit";

export interface ViewDef {
  label: string;
  /** 이 시점에서 잘 보이는 것 / 안 보이는 것 */
  hint: string;
  /** 카메라 위치 = 플레이어 위치 × follow + offset (월드 축 기준) */
  offset: [number, number, number];
  followX: number;
  followY: number;
  /** 바라보는 방향과 위쪽 방향 (고정 — 회전하지 않는다) */
  dir: [number, number, number];
  up: [number, number, number];
  fov: number;
}

export const VIEW_ORDER: ViewId[] = ["chase", "high", "top", "side", "cockpit"];

export const VIEWS: Record<ViewId, ViewDef> = {
  chase: {
    label: "추적",
    hint: "뒤에서 따라가는 기본 시점",
    offset: [0, 3.2, -13],
    followX: 0.5,
    followY: 0.5,
    dir: [0, -0.07, 1],
    up: [0, 1, 0],
    fov: 62,
  },
  high: {
    label: "높은 추적",
    hint: "더 높고 멀리서 봐서 앞길 전체가 보여요",
    offset: [0, 16, -30],
    followX: 0.8,
    followY: 0.8,
    dir: [0, -0.45, 1],
    up: [0, 1, 0],
    fov: 60,
  },
  top: {
    label: "위에서",
    hint: "좌우 위치(x)와 거리(z)가 보여요. 높이는 안 보여요",
    offset: [0, 46, 14],
    followX: 1,
    followY: 0,
    dir: [0, -1, 0],
    up: [0, 0, 1],
    fov: 50,
  },
  side: {
    label: "옆에서",
    hint: "높이(y) 변화와 거리(z)가 보여요 — 자유낙하·포물선 관찰용 (좌우 이동은 안 보여요)",
    offset: [-34, 0, 16],
    followX: 1,
    followY: 0.85,
    dir: [1, 0, 0],
    up: [0, 1, 0],
    fov: 50,
  },
  cockpit: {
    label: "1인칭",
    hint: "우주선 앞머리에서 본 시점",
    offset: [0, 0.4, 1.2],
    followX: 1,
    followY: 1,
    dir: [0, 0, 1],
    up: [0, 1, 0],
    fov: 78,
  },
};
