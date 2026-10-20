import { useState, type ReactNode } from "react";
import type { ObstacleSettings } from "../types";

interface Props {
  best: number;
  accountSlot: ReactNode;
  leaderboardSlot: ReactNode;
  onStart: (settings: ObstacleSettings) => void;
}

export default function SettingsScreen({ best, accountSlot, leaderboardSlot, onStart }: Props) {
  const [verticalSpeed, setVerticalSpeed] = useState(3);
  const [horizontalSpeed, setHorizontalSpeed] = useState(2);

  return (
    <div className="overlay-screen">
      <div className="panel">
        <h1>궤도이탈</h1>
        <p className="subtitle">중력과 힘의 크기를 조절해 여러 중력장을 통과하세요.</p>

        {accountSlot}

        <div className="field">
          <label>
            운석 수직 낙하 속도 <span>{verticalSpeed.toFixed(1)} m/s</span>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={verticalSpeed}
            onChange={(e) => setVerticalSpeed(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label>
            운석 수평 이동 속도 <span>{horizontalSpeed.toFixed(1)} m/s</span>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={horizontalSpeed}
            onChange={(e) => setHorizontalSpeed(Number(e.target.value))}
          />
        </div>

        <ul className="rules">
          <li>방향키 / WASD로 이동, Shift로 부스트 (연료 소모)</li>
          <li>중력장 중심의 고리를 통과해야 성공 — 3회 놓치면 실패</li>
          <li>운석에 부딪히면 즉시 실패</li>
          <li>연료가 거의 떨어지면 기름 아이템이 등장 (먹으면 질량 증가)</li>
          <li>점수 = 이동 거리(m)</li>
        </ul>

        <div className="best-line">최고기록: {best} m</div>

        <button className="primary-btn" onClick={() => onStart({ verticalSpeed, horizontalSpeed })}>
          출발
        </button>
      </div>
      <div className="panel side-panel">{leaderboardSlot}</div>
    </div>
  );
}
