import { useEffect, useRef } from "react";
import { OBSTACLE_GRAVITY } from "../constants/physics";
import { COLORS } from "../constants/theme";

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
const DROP_X = 40;
const THROW_X = 120;
/** 실제 4초 동안의 운동을 이만큼의 시간(ms)에 보여 준다 */
const PLAY_MS = 2400;

/**
 * 자유낙하와 수평투사 비교. 0.5초마다 위치를 찍은 점(스트로보 사진)과,
 * 두 공이 실제로 같이 떨어지는 애니메이션을 함께 보여 준다.
 * 두 공은 같은 시각에 항상 같은 높이에 있다 (수직 운동은 수평 속도와 무관: 독립성 원리).
 */
export default function ProjectileCompare({ v0, vx }: Props) {
  const g = OBSTACLE_GRAVITY;
  const yAt = (t: number) => v0 * t + 0.5 * g * t * t;
  const yMax = Math.max(yAt(T_END), 10);
  const ys = (H - TOP - 26) / yMax;
  const xs = 110 / (10 * T_END); // 수평 속도 1 m/s 당 픽셀
  const times: number[] = [];
  for (let t = 0; t <= T_END + 1e-9; t += STEP) times.push(t);

  const dropRef = useRef<SVGCircleElement>(null);
  const throwRef = useRef<SVGCircleElement>(null);

  // 속도를 바꿀 때마다 두 공이 다시 떨어진다 (무슨 값을 바꿨는지 바로 보이게)
  useEffect(() => {
    const drop = dropRef.current;
    const thrown = throwRef.current;
    if (!drop || !thrown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frames = 60;
    const dropFrames: Keyframe[] = [];
    const throwFrames: Keyframe[] = [];
    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * T_END;
      const y = yAt(t) * ys;
      dropFrames.push({ transform: `translate(0px, ${y}px)` });
      throwFrames.push({ transform: `translate(${vx * t * xs}px, ${y}px)` });
    }
    const options: KeyframeAnimationOptions = { duration: PLAY_MS, easing: "linear", fill: "forwards" };
    const a = drop.animate(dropFrames, options);
    const b = thrown.animate(throwFrames, options);
    return () => {
      a.cancel();
      b.cancel();
    };
    // yAt은 v0, g만 쓰므로 v0, vx가 바뀔 때 다시 재생하면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v0, vx]);

  return (
    <figure className="proj-compare">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <text x={DROP_X} y={H - 6} textAnchor="middle" fontSize="10" fill={COLORS.text}>
          자유낙하
        </text>
        <text x={THROW_X + 55} y={H - 6} textAnchor="middle" fontSize="10" fill={COLORS.text}>
          수평투사 (v = {vx.toFixed(1)} m/s)
        </text>
        {times.map((t) => {
          const y = TOP + yAt(t) * ys;
          return (
            <g key={t}>
              <line x1={DROP_X} y1={y} x2={THROW_X + vx * t * xs} y2={y} stroke={COLORS.line} strokeDasharray="3 3" />
              <circle cx={DROP_X} cy={y} r="3" fill="none" stroke={COLORS.accent} />
              <circle cx={THROW_X + vx * t * xs} cy={y} r="3" fill="none" stroke={COLORS.reaction} />
            </g>
          );
        })}
        {/* 실제로 떨어지는 두 공 (위치를 찍은 점과 같은 곳을 지난다) */}
        <circle ref={dropRef} cx={DROP_X} cy={TOP} r="4.5" fill={COLORS.accent} />
        <circle ref={throwRef} cx={THROW_X} cy={TOP} r="4.5" fill={COLORS.reaction} />
      </svg>
      <figcaption>가로 점선이 항상 수평 → 수직 운동은 똑같아요</figcaption>
    </figure>
  );
}
