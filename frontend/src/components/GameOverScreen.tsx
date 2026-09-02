import type { GameOverReason } from "../types";

interface Props {
  score: number;
  reason: GameOverReason;
  best: number;
  onRestart: () => void;
}

const REASON_TEXT: Record<GameOverReason, string> = {
  collision: "운석과 충돌했습니다.",
  "gate-miss": "중력장 게이트를 3번 놓쳤습니다.",
};

export default function GameOverScreen({ score, reason, best, onRestart }: Props) {
  const isNewBest = score >= best && score > 0;
  return (
    <div className="overlay-screen">
      <div className="panel">
        <h1>궤도 이탈</h1>
        <p className="subtitle">{REASON_TEXT[reason]}</p>
        <div className="score-result">{score} m</div>
        {isNewBest && <div className="new-best">🏆 신기록!</div>}
        <div className="best-line">최고기록: {best} m</div>
        <button className="primary-btn" onClick={onRestart}>
          다시 시작
        </button>
      </div>
    </div>
  );
}
