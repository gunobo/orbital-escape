export type ConceptId = "gravity" | "newton3" | "freefall" | "newton2" | "energy" | "inertia";

export interface Concept {
  id: ConceptId;
  title: string;
  summary: string;
  formula: string;
  /** 게임에서 어디를 보면 알 수 있는지 */
  how: string;
}

export const CONCEPTS: Concept[] = [
  {
    id: "gravity",
    title: "만유인력",
    summary: "질량이 클수록, 거리가 가까울수록 서로 끌어당기는 힘이 커져요.",
    formula: "F = G·M·m / r²",
    how: "중력장에 다가가면 보라색 화살표(중력 F)가 길어져요. 물리 패널의 F–r 그래프에서 거리가 절반이면 힘이 4배가 되는 걸 확인해요.",
  },
  {
    id: "newton3",
    title: "작용-반작용",
    summary: "힘은 항상 쌍으로 작용해요. 크기는 같고 방향은 반대! 그런데 질량이 작은 쪽이 훨씬 많이 끌려가요.",
    formula: "F(나→행성) = F(행성→나),  a = F / m",
    how: "보라(내가 받는 힘)와 주황(행성이 받는 힘) 화살표는 길이가 같아요. 가속도는 우주선이 행성보다 훨씬 커요.",
  },
  {
    id: "freefall",
    title: "자유낙하 vs 수평투사",
    summary: "가만히 떨어뜨려도, 옆으로 던져도 수직 방향 운동은 똑같아요. 수평은 등속, 수직은 등가속도이고 서로 독립이에요.",
    formula: "y = ½·g·t²,  x = v·t",
    how: "시작 화면의 비교 실험과, '옆에서' 시점에서 운석이 그리는 포물선을 관찰해 보세요.",
  },
  {
    id: "newton2",
    title: "F = ma",
    summary: "같은 힘이라도 무거우면 가속도가 작아요. 기름을 먹으면 무거워지고, 연료를 태우면 가벼워져요.",
    formula: "a = F / m",
    how: "기름을 먹기 전후로 같은 추력의 가속도(물리 패널)가 어떻게 달라지는지 보세요.",
  },
  {
    id: "energy",
    title: "에너지 보존과 손실",
    summary: "중력장에 다가가면 위치에너지가 운동에너지로 바뀌지만 합은 그대로예요. 제동하면 열·배기로 에너지가 빠져나가요(손실).",
    formula: "E = KE + PE",
    how: "물리 패널의 에너지 막대를 보세요. Z키로 관성 제어를 끄면 E가 일정하게 유지돼요.",
  },
  {
    id: "inertia",
    title: "관성 (뉴턴 제1법칙)",
    summary: "힘이 없으면 속도는 변하지 않아요. 우주에는 공기 저항이 없어서 계속 미끄러져 가요.",
    formula: "F = 0  →  v 일정",
    how: "Z키로 관성 제어를 끄고 가속한 뒤 손을 떼 보세요. 속도가 그대로 유지돼요.",
  },
];

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c])) as Record<ConceptId, Concept>;
