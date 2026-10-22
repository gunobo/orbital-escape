/** 물리 보기: 끔 → 화살표만(기본) → 화살표 + 패널. 기본 화면은 글이 거의 없게 한다 */
export type PhysicsView = "off" | "arrows" | "full";

const ORDER: PhysicsView[] = ["arrows", "full", "off"];

export const nextPhysicsView = (v: PhysicsView): PhysicsView => ORDER[(ORDER.indexOf(v) + 1) % ORDER.length];
