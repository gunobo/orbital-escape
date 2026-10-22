import { OBSTACLE_GRAVITY } from "../constants/physics";

interface Props {
  /** 처음 아래로 떨어지는 속도(m/s) */
  v0: number;
  /** 수평으로 던지는 속도(m/s) */
  vx: number;
}

const T_END = 4;
const STEP = 0.5;
const W = 270;
const H = 150;
const TOP = 14;

/**
 * 자유낙하와 수평투사 비교 (스트로보 사진처럼 0.5초마다 위치를 찍는다).
 * 두 운석은 같은 시각에 항상 같은 높이에 있다 → 수직 운동은 수평 속도와 무관 (독립성 원리).
 */
export default function ProjectileCompare({ v0, vx }: Props) {
  const g = OBSTACLE_GRAVITY;
  const yAt = (t: number) => v0 * t + 0.5 * g * t * t;
  const yMax = Math.max(yAt(T_END), 10);
  const ys = (H - TOP - 26) / yMax;
  const xs = 110 / (10 * T_END); // 수평 속도 1 m/s 당 픽셀
  const dropX = 40;
  const throwX = 120;
  const times: number[] = [];
  for (let t = 0; t <= T_END + 1e-9; t += STEP) times.push(t);

  return (
    <figure className="proj-compare">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <text x={dropX} y={H - 6} textAnchor="middle" fontSize="10" fill="#c6cdf0">
          자유낙하
        </text>
        <text x={throwX + 55} y={H - 6} textAnchor="middle" fontSize="10" fill="#c6cdf0">
          수평투사 (v = {vx.toFixed(1)} m/s)
        </text>
        {times.map((t) => {
          const y = TOP + yAt(t) * ys;
          return (
            <g key={t}>
              <line x1={dropX} y1={y} x2={throwX + vx * t * xs} y2={y} stroke="rgba(255,255,255,0.22)" strokeDasharray="3 3" />
              <circle cx={dropX} cy={y} r="4.5" fill="#ffb703" />
              <circle cx={throwX + vx * t * xs} cy={y} r="4.5" fill="#4ce08a" />
            </g>
          );
        })}
      </svg>
      <figcaption>
        0.5초마다 찍은 위치예요. 가로 점선이 항상 수평이죠? <b>수직 운동은 수평 속도와 상관없이 똑같아요</b> (g = {g} m/s², 달 표면 중력 값을 사용).
      </figcaption>
    </figure>
  );
}
