import * as C from "../constants/physics";
import type { RunSummary } from "../types";

/** 이번 판에서 실제로 겪은 값으로 쓰는 짧은 요약 (한 줄에 하나) */
export function summaryLines(s: RunSummary): string[] {
  const lines: string[] = [];
  lines.push(`🎯 게이트 ${s.gatesPassed}개 통과 · ${s.gatesMissed}개 놓침`);
  if (s.maxGravAccel > 0) {
    lines.push(`🪐 가장 센 중력 a = ${s.maxGravAccel.toFixed(1)} m/s² (r = ${s.maxGravAccelR.toFixed(1)} m)`);
  }
  if (s.maxMass - s.minMass > 0.02) {
    lines.push(
      `🚀 질량 ${s.minMass.toFixed(2)} ~ ${s.maxMass.toFixed(2)} → 가속도 ${(C.BASE_THRUST_FORCE / s.maxMass).toFixed(1)} ~ ${(C.BASE_THRUST_FORCE / s.minMass).toFixed(1)} m/s²`,
    );
  }
  if (s.brakeLoss > 0) {
    lines.push(`⚡ 엔진 일 ${s.engineWork.toFixed(0)} · 제동 손실 ${s.brakeLoss.toFixed(0)}`);
  }
  return lines;
}
