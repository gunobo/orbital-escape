import { ARROW_COLORS } from "./forceArrows";
import * as C from "../constants/physics";
import type { PhysicsSnapshot } from "../types";

interface Props {
  p: PhysicsSnapshot;
}

const R_MIN = C.GRAVITY_MIN_R;
const R_MAX = C.GRAVITY_FIELD_INFLUENCE_RADIUS;

/** F–r 그래프: 거리가 멀어질수록 힘이 1/r² 로 줄어드는 곡선과 현재 위치(점) */
function ForceCurve({ mass, mu, r }: { mass: number; mu: number; r: number | null }) {
  const W = 220;
  const H = 86;
  const fOf = (x: number) => (mass * mu) / (x * x);
  const fMax = fOf(R_MIN);
  const px = (x: number) => 8 + ((x - R_MIN) / (R_MAX - R_MIN)) * (W - 16);
  const py = (f: number) => H - 8 - (f / fMax) * (H - 16);
  const points: string[] = [];
  for (let x = R_MIN; x <= R_MAX; x += 0.5) points.push(`${px(x).toFixed(1)},${py(fOf(x)).toFixed(1)}`);
  const dot = r !== null ? Math.min(Math.max(r, R_MIN), R_MAX) : null;
  return (
    <svg className="force-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1="8" y1={H - 8} x2={W - 8} y2={H - 8} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <line x1="8" y1="6" x2="8" y2={H - 8} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <polyline points={points.join(" ")} fill="none" stroke={ARROW_COLORS.gravity} strokeWidth="2" />
      {dot !== null && (
        <>
          <line x1={px(dot)} y1={py(fOf(dot))} x2={px(dot)} y2={H - 8} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
          <circle cx={px(dot)} cy={py(fOf(dot))} r="4.5" fill="#fff" />
        </>
      )}
      <text x={W - 10} y={H - 12} textAnchor="end" fontSize="9" fill="#9aa5c9">
        거리 r →
      </text>
      <text x="12" y="14" fontSize="9" fill="#9aa5c9">
        힘 F
      </text>
    </svg>
  );
}

function Bar({ value, max, color, signed = false }: { value: number; max: number; color: string; signed?: boolean }) {
  const frac = Math.max(-1, Math.min(1, value / max));
  return (
    <div className={"mini-bar" + (signed ? " mini-bar-signed" : "")}>
      <div
        className="mini-bar-fill"
        style={signed ? { left: frac >= 0 ? "50%" : `${50 + frac * 50}%`, width: `${Math.abs(frac) * 50}%`, background: color } : { width: `${Math.abs(frac) * 100}%`, background: color }}
      />
    </div>
  );
}

const f1 = (v: number) => v.toFixed(1);

export default function PhysicsPanel({ p }: Props) {
  const field = p.field;
  const mech = p.ke + p.pe;

  return (
    <aside className="physics-panel">
      <div className="pp-legend">
        <span style={{ color: ARROW_COLORS.gravity }}>● 중력</span>
        <span style={{ color: ARROW_COLORS.reaction }}>● 반작용</span>
        <span style={{ color: ARROW_COLORS.thrust }}>● 엔진</span>
        <span style={{ color: ARROW_COLORS.velocity }}>● 속도</span>
      </div>

      <details open>
        <summary>만유인력 F = GMm/r²</summary>
        <ForceCurve mass={p.mass} mu={field?.mu ?? C.GRAVITY_FIELD_MU_BASE} r={field ? field.r : null} />
        <div className="pp-lines">
          {field ? (
            <>
              r <b>{f1(field.r)}</b> m · m <b>{p.mass.toFixed(2)}</b> · F <b>{field.force.toFixed(2)}</b>
            </>
          ) : (
            <span className="pp-dim">중력장 밖</span>
          )}
        </div>
      </details>

      <details open>
        <summary>작용-반작용</summary>
        <div className="pp-lines">
          {field ? (
            <>
              <div className="pp-pair">
                <span style={{ color: ARROW_COLORS.gravity }}>나 {field.force.toFixed(2)}</span>
                <span>=</span>
                <span style={{ color: ARROW_COLORS.reaction }}>행성 {field.force.toFixed(2)}</span>
              </div>
              <div>
                가속도 나 <b>{field.aMe.toFixed(1)}</b> · 행성 <b>{field.aPlanet.toExponential(1)}</b>
              </div>
            </>
          ) : (
            <span className="pp-dim">중력장 밖</span>
          )}
        </div>
      </details>

      <details>
        <summary>속도 (수평·수직 독립)</summary>
        <div className="pp-lines">
          <div className="pp-row">
            <span>수평 {f1(p.vForward)}</span>
            <Bar value={p.vForward} max={26} color="#7cd3ff" />
          </div>
          <div className="pp-row">
            <span>수직 {f1(p.vUp)}</span>
            <Bar value={p.vUp} max={12} color="#4ce08a" signed />
          </div>
          <div className="pp-row">
            <span>좌우 {f1(p.vRight)}</span>
            <Bar value={p.vRight} max={12} color="#ffb703" signed />
          </div>
        </div>
      </details>

      <details>
        <summary>F = ma</summary>
        <div className="pp-lines">
          F <b>{p.thrustForce.toFixed(1)}</b> → a <b>{p.thrustAccel.toFixed(1)}</b> · m <b>{p.mass.toFixed(2)}</b>
        </div>
      </details>

      <details>
        <summary>에너지</summary>
        <div className="pp-lines">
          <div className="pp-row">
            <span>운동 {p.ke.toFixed(0)}</span>
            <Bar value={p.ke} max={400} color="#7cd3ff" />
          </div>
          <div className="pp-row">
            <span>위치 {p.pe.toFixed(0)}</span>
            <Bar value={p.pe} max={200} color="#b388ff" signed />
          </div>
          <div>
            합 E <b>{mech.toFixed(0)}</b> · 손실 <b style={{ color: "#ff8a8a" }}>{p.brakeLoss.toFixed(0)}</b>
          </div>
        </div>
      </details>
    </aside>
  );
}
