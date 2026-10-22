import { GasPump, Heart } from "@phosphor-icons/react";
import * as C from "../constants/physics";
import { COLORS } from "../constants/theme";
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
  const color = gate.aligned ? COLORS.ok : COLORS.accent;
  return (
    <svg className="gate-radar" viewBox={`${-RADAR_RANGE - 1} ${-RADAR_RANGE - 1} ${RADAR_RANGE * 2 + 2} ${RADAR_RANGE * 2 + 2}`}>
      <rect x={-RADAR_RANGE} y={-RADAR_RANGE} width={RADAR_RANGE * 2} height={RADAR_RANGE * 2} fill="rgba(13,14,16,0.6)" stroke="#2b2e33" strokeWidth="0.3" />
      <line x1={-RADAR_RANGE} y1="0" x2={RADAR_RANGE} y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.2" />
      <line x1="0" y1={-RADAR_RANGE} x2="0" y2={RADAR_RANGE} stroke="rgba(255,255,255,0.12)" strokeWidth="0.2" />
      <circle cx="0" cy="0" r={gate.gateRadius} fill="none" stroke={color} strokeWidth="0.7" />
      <circle cx={dotX} cy={dotY} r="1.1" fill={color} />
    </svg>
  );
}

function guideText(gate: NonNullable<HudSnapshot["gate"]>): string {
  if (gate.aligned) return "정렬됨";
  const parts: string[] = [];
  if (Math.abs(gate.right) >= 0.5) parts.push(`${gate.right > 0 ? "→" : "←"} ${Math.abs(gate.right).toFixed(1)}m`);
  if (Math.abs(gate.up) >= 0.5) parts.push(`${gate.up > 0 ? "↑" : "↓"} ${Math.abs(gate.up).toFixed(1)}m`);
  return parts.join("  ");
}

/** 남은 목숨: 게이트를 놓칠 때마다 하나씩 줄고, 0이 되면 끝난다 */
function Lives({ misses }: { misses: number }) {
  const left = Math.max(0, C.MAX_MISSES - misses);
  return (
    <div className="lives" key={misses} aria-label={`남은 목숨 ${left}개`}>
      {Array.from({ length: C.MAX_MISSES }, (_, i) => (
        <Heart key={i} size={26} weight={i < left ? "fill" : "regular"} className={i < left ? "heart" : "heart heart-lost"} aria-hidden />
      ))}
    </div>
  );
}

export default function HUD({ hud, best }: Props) {
  const fuelPct = Math.round((hud.fuel / C.FUEL_MAX) * 100);
  const fuelLow = hud.fuel <= C.OIL_TRIGGER_THRESHOLD;

  return (
    <div className="hud">
      <div className="hud-top">
        <div>
          <div className="hud-score">
            <span className="hud-score-value">{hud.scoreMeters}</span>
            <span className="hud-score-unit">m</span>
          </div>
          <div className="hud-best">최고기록 {best} m</div>
        </div>
        <div className="hud-lives-box">
          <Lives misses={hud.misses} />
        </div>
      </div>

      {hud.gate && (
        <div className={"gate-guide" + (hud.gate.aligned ? " gate-ok" : "")}>
          <GateRadar gate={hud.gate} />
          <div className="gate-text">
            <div className="gate-title">게이트 {Math.max(0, Math.round(hud.gate.distance))}m</div>
            <div className="gate-dir">{guideText(hud.gate)}</div>
          </div>
        </div>
      )}

      <div className="hud-panel">
        <div className="hud-row">
          <GasPump size={16} aria-label="연료" />
          <div className="bar">
            <div
              className={"bar-fill" + (fuelLow ? " bar-fill-low" : "")}
              style={{ width: `${fuelPct}%` }}
            />
          </div>
          <span className="hud-mass">m {hud.mass.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
