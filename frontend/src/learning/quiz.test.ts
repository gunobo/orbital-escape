import { describe, expect, it } from "vitest";
import { mulberry32 } from "../systems/testing";
import type { RunSummary } from "../types";
import { CONCEPTS } from "./concepts";
import { emptyProgress, isMastered, MASTERY_CORRECT, recordAnswer } from "./progress";
import { pickQuiz } from "./quiz";
import { summaryLines } from "./summary";

const RUN: RunSummary = {
  obstacle: { verticalSpeed: 3, horizontalSpeed: 2 },
  maxGravAccel: 8,
  maxGravAccelR: 7.5,
  minMass: 1.2,
  maxMass: 1.6,
  oilPickups: 1,
  gatesPassed: 3,
  gatesMissed: 1,
  timeInField: 4,
  engineWork: 120,
  brakeLoss: 55,
};

describe("퀴즈", () => {
  it("서로 다른 개념으로 요청한 개수만큼 낸다", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = pickQuiz(RUN, emptyProgress(), mulberry32(seed), 3);
      expect(qs).toHaveLength(3);
      expect(new Set(qs.map((q) => q.concept)).size).toBe(3);
    }
  });

  it("모든 문제의 정답 위치가 선택지 안에 있고 선택지는 서로 다르다", () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const q of pickQuiz(RUN, emptyProgress(), mulberry32(seed), 6)) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(q.explain.length).toBeGreaterThan(5);
      }
    }
  });

  it("이번 판의 숫자로 만든 문제는 역제곱 법칙대로 정답이 1/4배다", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = pickQuiz(RUN, emptyProgress(), mulberry32(seed), 6).find((x) => x.id === "g-run");
      if (!q) continue;
      expect(q.choices[q.answer]).toBe(`${(RUN.maxGravAccel / 4).toFixed(1)} m/s²`);
      return;
    }
    throw new Error("동적 문제가 한 번도 나오지 않았다");
  });

  it("중력장을 겪지 않은 판에서는 중력 수치 문제를 내지 않는다", () => {
    const calm: RunSummary = { ...RUN, maxGravAccel: 0, timeInField: 0 };
    for (let seed = 1; seed <= 100; seed++) {
      expect(pickQuiz(calm, emptyProgress(), mulberry32(seed), 6).some((q) => q.id === "g-run")).toBe(false);
    }
  });

  it("이미 이해한 개념보다 아직 모르는 개념을 우선한다", () => {
    let p = emptyProgress();
    for (const c of CONCEPTS.filter((c) => c.id !== "newton3")) {
      for (let i = 0; i < MASTERY_CORRECT; i++) p = recordAnswer(p, c.id, true);
    }
    for (let seed = 1; seed <= 30; seed++) {
      expect(pickQuiz(RUN, p, mulberry32(seed), 1)[0].concept).toBe("newton3");
    }
  });
});

describe("학습 진행도 / 요약", () => {
  it("정답을 일정 횟수 맞혀야 이해한 개념이 된다", () => {
    let p = emptyProgress();
    p = recordAnswer(p, "gravity", true);
    p = recordAnswer(p, "gravity", false);
    expect(isMastered(p, "gravity")).toBe(false);
    p = recordAnswer(p, "gravity", true);
    expect(isMastered(p, "gravity")).toBe(true);
    expect(p.gravity).toEqual({ correct: 2, attempts: 3 });
  });

  it("요약은 이번 판 숫자를 담는다", () => {
    const text = summaryLines(RUN).join("\n");
    expect(text).toContain("a = 8.0 m/s²");
    expect(text).toContain("r = 7.5 m");
    expect(text).toContain("1.20 ~ 1.60");
  });
});
