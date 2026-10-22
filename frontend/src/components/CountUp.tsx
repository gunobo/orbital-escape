import { useEffect, useMemo, useState } from "react";

interface Props {
  value: number;
  /** 올라가는 데 걸리는 시간(ms) */
  duration?: number;
}

/** 결과 점수가 0에서 올라가며 보인다. 모션 줄이기를 켠 사람에게는 바로 최종 값을 보여 준다. */
export default function CountUp({ value, duration = 900 }: Props) {
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // 빠르게 올라가다 천천히 멈춘다
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return <>{(reduce ? value : shown).toLocaleString()}</>;
}
