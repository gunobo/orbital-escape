import { describe, it } from "vitest";
import * as C from "../constants/physics";
import { createBot, PROFILES } from "./bot";
import { createSim, score, stepSim } from "./simulation";
import { mulberry32 } from "./testing";

/**
 * 밸런스 리포트: `npm run balance`
 * 봇이 N판씩 플레이한 결과(생존 거리, 사망 원인, 연료/질량 추이)를 표로 출력한다.
 * 봇은 사람의 "상대적인" 난이도 차이를 보기 위한 근사치일 뿐, 절대 기준은 아니다.
 */
const RUNS = Number(import.meta.env.VITE_RUNS ?? 150);
const MAX_SECONDS = 900;
const DT = 1 / 60;

const SCENARIOS = [
  { name: "easy(0/0)", v: 0, h: 0 },
  { name: "default(3/2)", v: 3, h: 2 },
  { name: "hard(8/6)", v: 8, h: 6 },
];

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

describe.skipIf(!import.meta.env.VITE_BALANCE)("balance report", () => {
  it("봇 시뮬레이션", () => {
    const rows: Record<string, string | number>[] = [];
    for (const sc of SCENARIOS) {
      for (const profile of PROFILES) {
        const dist: number[] = [];
        const cause = { collision: 0, "gate-miss": 0, survived: 0 };
        let oilTotal = 0;
        let emptyFuelRuns = 0;
        let massEnd = 0;
        for (let seed = 1; seed <= RUNS; seed++) {
          const rng = mulberry32(seed * 7919);
          const sim = createSim({ verticalSpeed: sc.v, horizontalSpeed: sc.h }, rng);
          const bot = createBot(profile, mulberry32(seed * 104729));
          let pickups = 0;
          let lastMass = sim.mass;
          let wasEmpty = false;
          while (!sim.gameOver && sim.elapsed < MAX_SECONDS) {
            stepSim(sim, bot(sim, DT), DT);
            if (sim.mass > lastMass) pickups++;
            lastMass = sim.mass;
            if (sim.fuel <= 0) wasEmpty = true;
          }
          dist.push(score(sim));
          cause[sim.gameOver ?? "survived"]++;
          oilTotal += pickups;
          massEnd += sim.mass;
          if (wasEmpty) emptyFuelRuns++;
        }
        dist.sort((a, b) => a - b);
        rows.push({
          scenario: sc.name,
          bot: profile.name,
          "p10": pct(dist, 10),
          "median": pct(dist, 50),
          "p90": pct(dist, 90),
          "collision%": Math.round((cause.collision / RUNS) * 100),
          "gate%": Math.round((cause["gate-miss"] / RUNS) * 100),
          "alive%": Math.round((cause.survived / RUNS) * 100),
          oil: +(oilTotal / RUNS).toFixed(1),
          "mass": +(massEnd / RUNS).toFixed(2),
          "fuel0%": Math.round((emptyFuelRuns / RUNS) * 100),
        });
      }
    }
    console.log(
      `\n[balance] runs=${RUNS} fuelMass=${C.FUEL_MASS_PER_UNIT}/unit thrust=${C.BASE_THRUST_FORCE} gate=${C.GRAVITY_FIELD_GATE_RADIUS} mu=${C.GRAVITY_FIELD_MU_BASE}+${C.GRAVITY_FIELD_MU_GAIN_PER_METER}z\n`,
    );
    console.table(rows);
  }, 600_000);
});
