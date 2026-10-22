/**
 * 카메라는 항상 월드 +z(진행 방향)만 바라보고 회전하지 않는다 (평행이동만 한다).
 * 카메라가 움직이는 물체를 따라 회전하면 화면 전체가 흔들려 멀미가 나기 쉽다.
 */
export const CAMERA_YAW = Math.PI;
export const CAMERA_PITCH_DOWN = 0.07;
export const CAMERA_BACK = 13;
export const CAMERA_HEIGHT = 3.2;
export const CAMERA_FOLLOW = 0.5;

/**
 * +z를 바라보는 카메라에서는 화면 오른쪽이 월드 -x 이다.
 * 입력 "오른쪽"이 화면 오른쪽으로 움직이도록 시뮬레이션이 이 값을 곱해서 쓴다.
 * (카메라 방향과 같은 상수에서 계산하므로 서로 어긋날 수 없다.)
 */
export const SCREEN_RIGHT_X = Math.round(Math.cos(CAMERA_YAW));

/** 안개: 멀리(약 150m 앞)에서부터 게이트/운석이 보이되, 소환 지점(SPAWN_AHEAD_Z)은 안개 속에 가려지게 한다 */
export const FOG_NEAR = 70;
export const FOG_FAR = 210;
