import type { ReactNode } from "react";
import type { ScoreResult } from "../api";
import type { GameOverReason } from "../types";

interface Props {
  score: number;
  reason: GameOverReason;
  best: number;
  serverResult: ScoreResult | null;
  submitState: "idle" | "submitting" | "done" | "error" | "anonymous";
  leaderboardSlot: ReactNode;
  onRestart: () => void;
}

const REASON_TEXT: Record<GameOverReason, string> = {
  collision: "운석과 충돌했습니다.",
  "gate-miss": "중력장 게이트를 3번 놓쳤습니다.",
};

const SUBMIT_TEXT: Record<Props["submitState"], string> = {
  idle: "",
  submitting: "기록 전송 중...",
  done: "",
  error: "기록 전송에 실패했습니다. (로컬 기록은 저장됨)",
  anonymous: "로그인하면 랭킹에 기록이 등록됩니다.",
};

export default function GameOverScreen({
  score,
  reason,
  best,
  serverResult,
  submitState,
  leaderboardSlot,
  onRestart,
}: Props) {
  const isNewBest = serverResult ? serverResult.is_new_best : score >= best && score > 0;
  return (
    <div className="overlay-screen">
      <div className="panel">
        <h1>궤도 이탈</h1>
        <p className="subtitle">{REASON_TEXT[reason]}</p>
        <div className="score-result">{score} m</div>
        {isNewBest && <div className="new-best">🏆 신기록!</div>}
        {serverResult && <div className="best-line">전체 {serverResult.rank}위</div>}
        <div className="best-line">최고기록: {best} m</div>
        {SUBMIT_TEXT[submitState] && <p className="hint">{SUBMIT_TEXT[submitState]}</p>}
        <button className="primary-btn" onClick={onRestart}>
          다시 시작
        </button>
      </div>
      <div className="panel side-panel">{leaderboardSlot}</div>
    </div>
  );
}
