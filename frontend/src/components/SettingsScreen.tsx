import { useState, type ReactNode } from "react";
import { CONCEPTS } from "../learning/concepts";
import type { Progress } from "../learning/progress";
import type { ObstacleSettings } from "../types";
import ConceptBadges from "./ConceptBadges";
import ProjectileCompare from "./ProjectileCompare";
import type { ControlMode } from "./Scene";

interface Props {
  best: number;
  accountSlot: ReactNode;
  leaderboardSlot: ReactNode;
  progress: Progress;
  controlMode: ControlMode;
  onControlMode: (mode: ControlMode) => void;
  onStart: (settings: ObstacleSettings) => void;
}

export default function SettingsScreen({
  best,
  accountSlot,
  leaderboardSlot,
  progress,
  controlMode,
  onControlMode,
  onStart,
}: Props) {
  const [verticalSpeed, setVerticalSpeed] = useState(3);
  const [horizontalSpeed, setHorizontalSpeed] = useState(2);

  return (
    <div className="overlay-screen">
      <div className="panel">
        <h1>궤도이탈</h1>
        <p className="subtitle">중력장의 고리를 통과하며 우주를 날아가세요. 하면서 물리를 배워요!</p>

        {accountSlot}

        <div className="field">
          <label>
            🖱 조종 방식
            <span>{controlMode === "mouse" ? "마우스 (쉬움)" : "키보드 (직접 가속)"}</span>
          </label>
          <div className="seg">
            <button className={controlMode === "mouse" ? "seg-on" : ""} onClick={() => onControlMode("mouse")}>
              마우스로 가리키기 (추천)
            </button>
            <button className={controlMode === "keyboard" ? "seg-on" : ""} onClick={() => onControlMode("keyboard")}>
              키보드 (방향키/WASD)
            </button>
          </div>
        </div>

        <h3 className="section-title">☄️ 운석 실험: 자유낙하 vs 수평투사</h3>
        <div className="field">
          <label>
            처음 낙하 속도 (수직) <span>{verticalSpeed.toFixed(1)} m/s</span>
          </label>
          <input type="range" min={0} max={10} step={0.5} value={verticalSpeed} onChange={(e) => setVerticalSpeed(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>
            수평 속도 <span>{horizontalSpeed.toFixed(1)} m/s</span>
          </label>
          <input type="range" min={0} max={10} step={0.5} value={horizontalSpeed} onChange={(e) => setHorizontalSpeed(Number(e.target.value))} />
        </div>
        <ProjectileCompare v0={verticalSpeed} vx={horizontalSpeed} />

        <ul className="rules">
          <li>중력장 한가운데의 고리를 통과하세요. 놓치면 목숨 -1 (❤️ 3개)</li>
          <li>운석에 부딪히면 즉시 종료, 연료가 떨어져 가면 기름이 나타나요</li>
          <li>점수 = 이동 거리(m) · 게임 중 Space로 일시정지, C로 시점 전환</li>
        </ul>

        <div className="best-line">최고기록: {best} m</div>

        <button className="primary-btn" onClick={() => onStart({ verticalSpeed, horizontalSpeed })}>
          출발
        </button>
      </div>

      <div className="side-col">
        <div className="panel side-panel">{leaderboardSlot}</div>
        <div className="panel side-panel">
          <ConceptBadges progress={progress} />
        </div>
        <div className="panel side-panel concept-list">
          <h2>이 게임에서 배우는 것</h2>
          {CONCEPTS.map((c) => (
            <details key={c.id}>
              <summary>
                {c.icon} {c.title}
              </summary>
              <p>{c.summary}</p>
              <p>
                <code>{c.formula}</code>
              </p>
              <p className="how">👀 {c.how}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
