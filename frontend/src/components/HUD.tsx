import * as C from "../constants/physics";
import type { HudSnapshot } from "../types";

interface Props {
  hud: HudSnapshot;
  best: number;
}

export default function HUD({ hud, best }: Props) {
  const fuelPct = Math.round((hud.fuel / C.FUEL_MAX) * 100);
  const fuelLow = hud.fuel <= C.OIL_TRIGGER_THRESHOLD;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-score">
          <span className="hud-score-value">{hud.scoreMeters}</span>
          <span className="hud-score-unit">m</span>
        </div>
        <div className="hud-best">최고기록 {best} m</div>
      </div>

      <div className="hud-panel">
        <div className="hud-row">
          <span>연료</span>
          <div className="bar">
            <div
              className={"bar-fill" + (fuelLow ? " bar-fill-low" : "")}
              style={{ width: `${fuelPct}%` }}
            />
          </div>
        </div>
        <div className="hud-row hud-stats">
          <span>질량 ×{hud.mass.toFixed(2)}</span>
          <span>
            게이트 미스 {hud.misses}/{C.MAX_MISSES}
          </span>
        </div>
        <div className="hud-row hud-stats">
          <span>수평(전진) 속도 {hud.forwardSpeed.toFixed(1)} m/s</span>
          <span>수직(횡) 속도 {hud.lateralSpeed.toFixed(1)} m/s</span>
        </div>
        {hud.fieldInfo && (
          <div className="hud-field-info">
            힘: 서로 동일(뉴턴 3법칙) · 가속도는 질량에 반비례 → 나 a≈
            {hud.fieldInfo.playerAccel.toFixed(1)} m/s², 행성 a≈
            {hud.fieldInfo.fieldAccel.toExponential(2)} m/s² (질량비 1:
            {Math.round(hud.fieldInfo.massRatio).toLocaleString()})
          </div>
        )}
      </div>

      <div className="hud-controls-hint">방향키/WASD 이동 · Shift 부스트</div>
    </div>
  );
}
