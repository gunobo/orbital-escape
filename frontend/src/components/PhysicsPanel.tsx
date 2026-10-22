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
  const maxAccel = C.BASE_THRUST_FORCE / p.mass;

  return (
    <aside className="physics-panel">
      <div className="pp-title">🔬 물리 패널 <span>(H로 숨기기)</span></div>
      <div className="pp-legend">
        <span style={{ color: ARROW_COLORS.gravity }}>● 중력(내가 받는 힘)</span>
        <span style={{ color: ARROW_COLORS.reaction }}>● 반작용(행성이 받는 힘)</span>
        <span style={{ color: ARROW_COLORS.thrust }}>● 엔진 힘</span>
        <span style={{ color: ARROW_COLORS.velocity }}>● 속도</span>
      </div>

      <details open>
        <summary>① 만유인력  F = G·M·m / r²</summary>
        <ForceCurve mass={p.mass} mu={field?.mu ?? C.GRAVITY_FIELD_MU_BASE} r={field ? field.r : null} />
        {field ? (
          <div className="pp-lines">
            <div>
              r = <b>{f1(field.r)} m</b> · 행성 M = {field.planetMass.toExponential(1)} · 내 m = <b>{p.mass.toFixed(2)}</b>
            </div>
            <div>
              F = <b>{field.force.toFixed(2)}</b> <small>(게임 단위)</small>
            </div>
            <div className="pp-note">거리가 절반이면 F는 4배, 내 질량이 2배면 F도 2배!</div>
          </div>
        ) : (
          <div className="pp-lines pp-note">중력장에 가까이 가면 점이 곡선을 따라 올라가요. (곡선은 현재 질량 기준)</div>
        )}
      </details>

      <details open>
        <summary>② 작용-반작용 (뉴턴 제3법칙)</summary>
        {field ? (
          <div className="pp-lines">
            <div className="pp-pair">
              <span style={{ color: ARROW_COLORS.gravity }}>나가 받는 힘 {field.force.toFixed(2)}</span>
              <span>=</span>
              <span style={{ color: ARROW_COLORS.reaction }}>행성이 받는 힘 {field.force.toFixed(2)}</span>
            </div>
            <div>
              가속도 a = F/m → 나 <b>{field.aMe.toFixed(1)} m/s²</b> · 행성 <b>{field.aPlanet.toExponential(1)} m/s²</b>
            </div>
            <div className="pp-note">힘은 같은데 질량비가 1 : {Math.round(field.massRatio).toLocaleString()} 이라서 내가 훨씬 더 끌려가요.</div>
          </div>
        ) : (
          <div className="pp-lines pp-note">중력장 안에서 보라색(나)·주황색(행성) 화살표 길이가 같은 걸 확인해 보세요.</div>
        )}
      </details>

      <details open>
        <summary>③ 자유낙하 vs 수평투사 (독립성)</summary>
        <div className="pp-lines">
          <div className="pp-row">
            <span>수평(전진) {f1(p.vForward)} m/s</span>
            <Bar value={p.vForward} max={26} color="#7cd3ff" />
          </div>
          <div className="pp-row">
            <span>수직(위+) {f1(p.vUp)} m/s</span>
            <Bar value={p.vUp} max={12} color="#4ce08a" signed />
          </div>
          <div className="pp-row">
            <span>좌우(오른쪽+) {f1(p.vRight)} m/s</span>
            <Bar value={p.vRight} max={12} color="#ffb703" signed />
          </div>
          <div className="pp-note">운석: 수직은 등가속도, 수평은 등속 — 두 운동은 서로 독립이에요. ('옆에서' 시점으로 포물선을 보세요)</div>
        </div>
      </details>

      <details>
        <summary>④ F = ma (질량과 가속도)</summary>
        <div className="pp-lines">
          <div>
            엔진 힘 F = <b>{p.thrustForce.toFixed(1)}</b> → 가속도 a = F/m = <b>{p.thrustAccel.toFixed(1)} m/s²</b>
          </div>
          <div>
            내 질량 m = <b>{p.mass.toFixed(2)}</b> → 최대 가속도 {C.BASE_THRUST_FORCE}/{p.mass.toFixed(2)} = <b>{maxAccel.toFixed(1)} m/s²</b>
          </div>
          <div className="pp-note">기름을 먹으면 m↑ → 같은 힘에도 a↓, 연료를 태우면 m↓ → a↑</div>
        </div>
      </details>

      <details open>
        <summary>⑤ 에너지 보존과 손실</summary>
        <div className="pp-lines">
          <div className="pp-row">
            <span>운동에너지 ½mv² = {p.ke.toFixed(0)}</span>
            <Bar value={p.ke} max={400} color="#7cd3ff" />
          </div>
          <div className="pp-row">
            <span>위치에너지 (중력) = {p.pe.toFixed(0)}</span>
            <Bar value={p.pe} max={200} color="#b388ff" signed />
          </div>
          <div>
            역학적 에너지 E = KE + PE = <b>{mech.toFixed(0)}</b>
          </div>
          <div>엔진이 해 준 일 {p.engineWork.toFixed(0)} · 제동으로 손실 <b style={{ color: "#ff8a8a" }}>{p.brakeLoss.toFixed(0)}</b></div>
          <div className="pp-note">
            {p.inertialControl
              ? "관성 제어가 운동에너지를 연료로 태워 없애는 중 → 손실(열·배기). Z키로 끄면 E가 보존돼요."
              : field && p.thrustForce === 0
                ? "✓ 힘을 안 주는 중력장 안: E가 거의 일정해요 (에너지 보존)"
                : "관성 제어 OFF: 힘이 없으면 속도가 그대로 유지돼요 (관성)."}
          </div>
        </div>
      </details>
    </aside>
  );
}
