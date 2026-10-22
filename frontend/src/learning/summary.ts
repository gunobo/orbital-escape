import * as C from "../constants/physics";
import type { RunSummary } from "../types";

/** 이번 판에서 실제로 겪은 값으로 쓰는 "오늘 배운 물리" 요약 */
export function summaryLines(s: RunSummary): string[] {
  const lines: string[] = [];
  lines.push(`🎯 게이트 ${s.gatesPassed}개 통과, ${s.gatesMissed}개 놓침`);
  if (s.maxGravAccel > 0) {
    lines.push(
      `🪐 가장 센 중력: 중심에서 ${s.maxGravAccelR.toFixed(1)} m 일 때 a = ${s.maxGravAccel.toFixed(1)} m/s². 거리가 2배면 ${(s.maxGravAccel / 4).toFixed(1)} m/s² 로 1/4 (F ∝ 1/r²)`,
    );
  }
  if (s.maxMass - s.minMass > 0.02) {
    lines.push(
      `🚀 질량 ${s.minMass.toFixed(2)} ~ ${s.maxMass.toFixed(2)}: 같은 엔진 힘 ${C.BASE_THRUST_FORCE}의 가속도가 ${(C.BASE_THRUST_FORCE / s.maxMass).toFixed(1)} ~ ${(C.BASE_THRUST_FORCE / s.minMass).toFixed(1)} m/s² (a = F/m)${s.oilPickups > 0 ? ` · 기름 ${s.oilPickups}번 → 그때마다 무거워짐` : ""}`,
    );
  }
  if (s.brakeLoss > 0 || s.engineWork !== 0) {
    lines.push(
      `⚡ 엔진이 해 준 일 ${s.engineWork.toFixed(0)}, 제동으로 줄어든 운동에너지 ${s.brakeLoss.toFixed(0)} → 사라진 게 아니라 열·배기로 바뀐 '손실'이에요`,
    );
  }
  lines.push(
    `☄️ 운석: 처음 낙하 ${s.obstacle.verticalSpeed.toFixed(1)} m/s · 수평 ${s.obstacle.horizontalSpeed.toFixed(1)} m/s · 가속도 g = ${C.OBSTACLE_GRAVITY} m/s² → 수직은 등가속도, 수평은 등속 (서로 독립)`,
  );
  return lines;
}
