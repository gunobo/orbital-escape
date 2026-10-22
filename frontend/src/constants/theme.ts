/**
 * 색 팔레트. 비행 계기판 느낌의 무채색 바탕에 포인트 색은 앰버 하나만 쓴다.
 * ok / danger 는 게이트 성공·실패, 목숨처럼 의미가 있는 곳에만 쓴다. (CSS 변수와 같은 값: App.css)
 */
export const COLORS = {
  bg: "#0d0e10",
  surface: "#15171a",
  line: "#2b2e33",
  text: "#dcdee1",
  dim: "#8b9099",
  accent: "#f0a23b",
  ok: "#6fbf8e",
  danger: "#e0645c",
  /** 게이트 고리: 평소 / 통과 / 놓침 */
  gate: "#cfd2d6",
  /** 힘 화살표 (무엇이 무엇인지 구분되는 색) */
  gravity: "#e0a244",
  reaction: "#6fa8dc",
  thrust: "#78b37f",
  velocity: "#d9dbde",
} as const;
