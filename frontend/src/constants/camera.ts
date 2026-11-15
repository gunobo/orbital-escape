/**
 * 우주선은 위에서 아래로 떨어진다: 시뮬레이션의 진행 축(+z)이 "아래"이고,
 * 기본 카메라는 우주선 위에서 그 방향을 내려다본다. 화면 위/아래는 월드 y, 좌우는 월드 x 이다.
 * 카메라는 항상 같은 방향만 바라보고 회전하지 않는다 (평행이동만 한다).
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
    label: "내려다보기",
    hint: "우주선 위에서 함께 떨어지며 아래를 내려다보는 기본 시점",
    offset: [0, 3.2, -13],
    followX: 0.5,
    followY: 0.5,
    dir: [0, -0.07, 1],
    up: [0, 1, 0],
    fov: 62,
  },
  high: {
    label: "높이서 보기",
    hint: "더 높이서 내려다봐서 아래쪽 길이 멀리까지 보여요",
    offset: [0, 16, -30],
    followX: 0.8,
    followY: 0.8,
    dir: [0, -0.45, 1],
    up: [0, 1, 0],
    fov: 60,
  },
  top: {
    label: "옆에서(좌우)",
    hint: "좌우 위치(x)와 떨어진 거리가 보여요. 화면 위아래(y)는 안 보여요",
    offset: [0, -46, 14],
    followX: 1,
    followY: 0,
    dir: [0, 1, 0],
    up: [0, 0, -1],
    fov: 50,
  },
  side: {
    label: "운석 관찰",
    hint: "화면 위아래(y) 변화와 떨어진 거리가 보여요. 운석의 자유낙하·포물선 관찰용이고 좌우 이동은 안 보여요",
    offset: [-34, 0, 16],
    followX: 1,
    followY: 0.85,
    dir: [1, 0, 0],
    up: [0, 1, 0],
    fov: 50,
  },
  cockpit: {
    label: "1인칭",
    hint: "우주선 앞머리에서 아래를 본 시점",
    offset: [0, 0.4, 1.2],
    followX: 1,
    followY: 1,
    dir: [0, 0, 1],
    up: [0, 1, 0],
    fov: 78,
  },
};
