import type { ConceptId } from "./concepts";
import { CONCEPTS } from "./concepts";

export type Progress = Record<ConceptId, { correct: number; attempts: number }>;

const KEY = "orbital-escape-learning";
/** 정답을 이만큼 맞히면 "이해함" 배지 */
export const MASTERY_CORRECT = 2;

export function emptyProgress(): Progress {
  return Object.fromEntries(CONCEPTS.map((c) => [c.id, { correct: 0, attempts: 0 }])) as Progress;
}

export function loadProgress(): Progress {
  const base = emptyProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Progress>;
    for (const c of CONCEPTS) {
      const s = saved[c.id];
      if (s && Number.isFinite(s.correct) && Number.isFinite(s.attempts)) base[c.id] = { correct: s.correct, attempts: s.attempts };
    }
  } catch {
    /* 저장소를 못 쓰면 이번 방문 동안만 기록 */
  }
  return base;
}

export function recordAnswer(progress: Progress, concept: ConceptId, correct: boolean): Progress {
  const prev = progress[concept];
  const next = { ...progress, [concept]: { correct: prev.correct + (correct ? 1 : 0), attempts: prev.attempts + 1 } };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 무시 */
  }
  return next;
}

export function isMastered(progress: Progress, concept: ConceptId): boolean {
  return progress[concept].correct >= MASTERY_CORRECT;
}

export function masteredCount(progress: Progress): number {
  return CONCEPTS.filter((c) => isMastered(progress, c.id)).length;
}
