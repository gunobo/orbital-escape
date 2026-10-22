import * as C from "../constants/physics";
import type { HudSnapshot } from "../types";

interface Props {
  hud: HudSnapshot;
  best: number;
}

const RADAR_RANGE = 14;

function GateRadar({ gate }: { gate: NonNullable<HudSnapshot["gate"]> }) {
  // 점 = 내 위치(게이트 중심 기준). 고리 안에 들어오면 통과 성공
  const dotX = Math.max(-RADAR_RANGE, Math.min(RADAR_RANGE, -gate.right));
  const dotY = Math.max(-RADAR_RANGE, Math.min(RADAR_RANGE, gate.up));
  const color = gate.aligned ? "#4ce08a" : "#ffb703";
  return (
    <svg className="gate-radar" viewBox={`${-RADAR_RANGE - 1} ${-RADAR_RANGE - 1} ${RADAR_RANGE * 2 + 2} ${RADAR_RANGE * 2 + 2}`}>
      <rect x={-RADAR_RANGE} y={-RADAR_RANGE} width={RADAR_RANGE * 2} height={RADAR_RANGE * 2} fill="rgba(10,12,24,0.55)" stroke="rgba(124,92,255,0.4)" strokeWidth="0.3" />
      <line x1={-RADAR_RANGE} y1="0" x2={RADAR_RANGE} y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.2" />
      <line x1="0" y1={-RADAR_RANGE} x2="0" y2={RADAR_RANGE} stroke="rgba(255,255,255,0.12)" strokeWidth="0.2" />
      <circle cx="0" cy="0" r={gate.gateRadius} fill="none" stroke={color} strokeWidth="0.7" />
      <circle cx={dotX} cy={dotY} r="1.1" fill={color} />
    </svg>
  );
}

function guideText(gate: NonNullable<HudSnapshot["gate"]>): string {
  if (gate.aligned) return "✓ 정렬됨 — 그대로 유지!";
  const parts: string[] = [];
  if (Math.abs(gate.right) >= 0.5) parts.push(`${gate.right > 0 ? "→" : "←"} ${Math.abs(gate.right).toFixed(1)}m`);
  if (Math.abs(gate.up) >= 0.5) parts.push(`${gate.up > 0 ? "↑" : "↓"} ${Math.abs(gate.up).toFixed(1)}m`);
  return parts.join("  ");
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

      {hud.gate && (
        <div className={"gate-guide" + (hud.gate.aligned ? " gate-ok" : "")}>
          <GateRadar gate={hud.gate} />
          <div className="gate-text">
            <div className="gate-title">다음 게이트 {Math.max(0, Math.round(hud.gate.distance))}m</div>
            <div className="gate-dir">{guideText(hud.gate)}</div>
          </div>
        </div>
      )}

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
            {C.MISS_RECOVER_STREAK > 0 && hud.misses > 0 && ` · 연속 ${hud.streak}/${C.MISS_RECOVER_STREAK}`}
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
