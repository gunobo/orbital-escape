import type { RunSummary } from "../types";
import type { Rng } from "../systems/spawner";
import type { ConceptId } from "./concepts";
import { isMastered, type Progress } from "./progress";

export interface Question {
  id: string;
  concept: ConceptId;
  text: string;
  choices: string[];
  /** choices 안의 정답 위치 */
  answer: number;
  explain: string;
}

/** 정답은 항상 첫 번째로 적어 두고, 출제할 때 섞는다 */
const BANK: { id: string; concept: ConceptId; text: string; choices: [string, ...string[]]; explain: string }[] = [
  {
    id: "g-dist",
    concept: "gravity",
    text: "중력장 중심까지의 거리가 절반이 되면, 나를 당기는 중력(F)은 몇 배가 될까요?  (F = GMm / r²)",
    choices: ["4배", "2배", "1/2배", "변함없다"],
    explain: "F는 거리의 제곱에 반비례해요. r이 1/2이면 r²은 1/4이라서 F는 4배가 돼요.",
  },
  {
    id: "g-mass",
    concept: "gravity",
    text: "내 우주선의 질량(m)이 2배가 되면, 행성이 나를 당기는 힘(F)은?",
    choices: ["2배", "1/2배", "4배", "변함없다"],
    explain: "F = GMm/r² 에서 F는 m에 비례해요. 질량이 클수록 서로 끌어당기는 힘도 커져요.",
  },
  {
    id: "g-equiv",
    concept: "gravity",
    text: "우주선이 무거워지면 중력(F)은 커져요. 그럼 중력 때문에 생기는 '가속도'는?",
    choices: ["변함없다 (F와 m이 같이 커져서)", "2배가 된다", "절반이 된다", "0이 된다"],
    explain: "a = F/m = GM/r² 이라서 우주선 질량 m이 약분돼요. 무거운 물체도 가벼운 물체와 똑같이 떨어져요(등가원리).",
  },
  {
    id: "n3-pair",
    concept: "newton3",
    text: "내가 행성을 당기는 힘과, 행성이 나를 당기는 힘을 비교하면?",
    choices: ["크기가 같고 방향은 반대", "행성이 훨씬 세다", "내가 더 세다", "행성은 나를 당기지 않는다"],
    explain: "작용-반작용(뉴턴 제3법칙): 힘은 항상 쌍으로 나타나고, 크기는 같고 방향은 반대예요.",
  },
  {
    id: "n3-acc",
    concept: "newton3",
    text: "두 힘의 크기가 같은데 우주선만 확 끌려가고 행성은 거의 안 움직이는 이유는?",
    choices: ["질량이 작을수록 가속도(a = F/m)가 크니까", "우주선만 힘을 받으니까", "행성은 중력이 없어서", "우주선이 더 빨라서"],
    explain: "같은 힘이라도 a = F/m 이라서 질량이 작은 쪽이 훨씬 큰 가속도로 끌려가요.",
  },
  {
    id: "f-same",
    concept: "freefall",
    text: "같은 높이에서 운석 하나는 가만히 떨어뜨리고, 다른 하나는 수평으로 던졌어요. 먼저 바닥에 닿는 것은?",
    choices: ["동시에 닿는다", "가만히 떨어뜨린 운석", "수평으로 던진 운석", "알 수 없다"],
    explain: "수직 운동(등가속도)과 수평 운동(등속)은 서로 독립이에요. 수평 속도는 낙하 시간에 영향을 주지 않아요.",
  },
  {
    id: "f-acc",
    concept: "freefall",
    text: "운석이 떨어질 때 수직 속도는 어떻게 변할까요?",
    choices: ["일정한 비율로 계속 빨라진다 (등가속도)", "일정하다", "점점 느려진다", "불규칙하게 변한다"],
    explain: "중력 가속도 g 때문에 매초 같은 크기만큼 빨라져요. 속도가 아니라 '가속도'가 일정한 거예요.",
  },
  {
    id: "f-horiz",
    concept: "freefall",
    text: "수평으로 던진 운석의 수평 방향 속도는 (공기 저항이 없다면)?",
    choices: ["일정하다", "점점 빨라진다", "점점 느려진다", "0이 된다"],
    explain: "수평 방향으로는 힘이 없어서 속도가 변하지 않아요(관성). 중력은 수직 방향으로만 작용해요.",
  },
  {
    id: "m-oil",
    concept: "newton2",
    text: "엔진이 내는 힘(F)이 같을 때, 기름을 먹어 질량이 커지면 가속도는?",
    choices: ["작아진다", "커진다", "변함없다", "0이 된다"],
    explain: "a = F/m. 같은 힘이면 질량이 클수록 가속도가 작아요. 그래서 기름을 먹으면 조작이 둔해져요.",
  },
  {
    id: "m-burn",
    concept: "newton2",
    text: "연료를 태워서 우주선이 가벼워지면, 같은 추력의 가속도는?",
    choices: ["커진다", "작아진다", "변함없다", "알 수 없다"],
    explain: "m이 줄어들면 a = F/m 은 커져요. 로켓은 연료를 태울수록 가벼워져서 점점 더 잘 가속돼요.",
  },
  {
    id: "e-fall",
    concept: "energy",
    text: "추력 없이 중력장에 가까워질 때, 에너지는 어떻게 바뀔까요?",
    choices: ["운동에너지↑, 위치에너지↓ (합은 일정)", "운동에너지↓, 위치에너지↑", "둘 다 증가", "둘 다 감소"],
    explain: "위치에너지가 운동에너지로 바뀌어요. 둘을 더한 역학적 에너지는 보존돼요.",
  },
  {
    id: "e-loss",
    concept: "energy",
    text: "관성 제어(자동 제동)로 줄어든 운동에너지는 어디로 갔을까요?",
    choices: ["열·배기 등으로 전환돼 손실됐다", "그냥 사라졌다", "위치에너지가 됐다", "행성에 저장됐다"],
    explain: "에너지는 사라지지 않아요. 쓸모 있는 운동에너지가 열·배기 같은 형태로 바뀌어 '손실'된 거예요.",
  },
  {
    id: "i-free",
    concept: "inertia",
    text: "관성 제어를 끄고 엔진도 껐을 때, 옆으로 움직이던 우주선의 속도는?",
    choices: ["그대로 유지된다", "점점 줄어든다", "점점 빨라진다", "바로 멈춘다"],
    explain: "뉴턴 제1법칙(관성): 힘이 없으면 속도가 변하지 않아요. 우주에는 공기 저항이 없어요.",
  },
];

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toQuestion(raw: (typeof BANK)[number], rng: Rng): Question {
  const correct = raw.choices[0];
  const choices = shuffle([...raw.choices], rng);
  return { id: raw.id, concept: raw.concept, text: raw.text, choices, answer: choices.indexOf(correct), explain: raw.explain };
}

/** 이번 판에서 실제로 겪은 숫자로 만든 문제: "그때 거리가 2배였다면 가속도는?" */
function gravityFromRun(summary: RunSummary, rng: Rng): Question | null {
  if (summary.maxGravAccel <= 0) return null;
  const a = summary.maxGravAccel;
  const r = summary.maxGravAccelR;
  const fmt = (v: number) => `${v.toFixed(1)} m/s²`;
  const correct = fmt(a / 4);
  const choices = shuffle([correct, fmt(a / 2), fmt(a * 2), fmt(a)], rng);
  return {
    id: "g-run",
    concept: "gravity",
    text: `이번 판에서 가장 센 중력은 중심에서 ${r.toFixed(1)} m 떨어진 곳에서 a = ${fmt(a)} 였어요. 거리가 2배(${(r * 2).toFixed(1)} m)였다면 가속도는?`,
    choices,
    answer: choices.indexOf(correct),
    explain: `a = GM/r² 라서 거리가 2배면 가속도는 1/4배, 즉 ${correct} 예요. (이번 판의 숫자로 계산한 문제!)`,
  };
}

/**
 * 이번 판에서 겪은 개념 + 아직 이해하지 못한 개념을 우선해서 문제를 고른다.
 * (한 개념에 한 문제씩, 서로 다른 개념으로 count개)
 */
export function pickQuiz(summary: RunSummary, progress: Progress, rng: Rng, count = 3): Question[] {
  const experienced: Record<ConceptId, boolean> = {
    gravity: summary.timeInField > 0,
    newton3: summary.timeInField > 0,
    freefall: true,
    newton2: summary.maxMass - summary.minMass > 0.02 || summary.oilPickups > 0,
    energy: summary.brakeLoss > 0 || summary.timeInField > 0,
    inertia: false,
  };
  const ranked = (Object.keys(experienced) as ConceptId[])
    .map((id) => ({ id, score: (experienced[id] ? 2 : 0) + (isMastered(progress, id) ? 0 : 1) + rng() * 0.9 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  return ranked.map(({ id }) => {
    if (id === "gravity") {
      const dynamic = gravityFromRun(summary, rng);
      if (dynamic && rng() < 0.6) return dynamic;
    }
    const pool = BANK.filter((q) => q.concept === id);
    return toQuestion(pool[Math.floor(rng() * pool.length)], rng);
  });
}

export const QUESTION_COUNT = BANK.length;
