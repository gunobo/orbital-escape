import type { ReactNode } from "react";
import type { ScoreResult } from "../api";
import type { ConceptId } from "../learning/concepts";
import type { Question } from "../learning/quiz";
import { summaryLines } from "../learning/summary";
import type { GameOverReason, RunSummary } from "../types";
import QuizPanel from "./QuizPanel";

export type SubmitState =
  | "idle"
  | "submitting"
  | "done"
  | "error"
  | "expired"
  | "no-login"
  | "no-nickname";

interface Props {
  score: number;
  reason: GameOverReason;
  best: number;
  serverResult: ScoreResult | null;
  submitState: SubmitState;
  summary: RunSummary | null;
  questions: Question[];
  onAnswer: (concept: ConceptId, correct: boolean) => void;
  leaderboardSlot: ReactNode;
  onRestart: () => void;
  onRetrySubmit: () => void;
}

const REASON_TEXT: Record<GameOverReason, string> = {
  collision: "운석과 충돌했습니다.",
  "gate-miss": "중력장 게이트를 3번 놓쳐 목숨을 모두 잃었습니다.",
};

const SUBMIT_TEXT: Record<SubmitState, string> = {
  idle: "",
  submitting: "랭킹에 기록 전송 중...",
  done: "",
  error: "⚠ 서버에 연결할 수 없어 랭킹에 등록하지 못했습니다. (로컬 기록은 저장됨)",
  expired: "⚠ 로그인이 만료되어 랭킹에 등록하지 못했습니다. 시작 화면에서 다시 로그인하세요.",
  "no-login": "로그인하지 않아 랭킹에 등록되지 않았습니다. 시작 화면에서 로그인하세요.",
  "no-nickname": "닉네임이 없어 랭킹에 등록되지 않았습니다. 시작 화면에서 닉네임을 정하세요.",
};

export default function GameOverScreen({
  score,
  reason,
  best,
  serverResult,
  submitState,
  summary,
  questions,
  onAnswer,
  leaderboardSlot,
  onRestart,
  onRetrySubmit,
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
        {SUBMIT_TEXT[submitState] && (
          <p className={submitState === "error" || submitState === "expired" ? "warn" : "hint"}>{SUBMIT_TEXT[submitState]}</p>
        )}
        {submitState === "error" && (
          <button className="ghost-btn" onClick={onRetrySubmit}>
            다시 전송
          </button>
        )}
        <button className="primary-btn" onClick={onRestart}>
          다시 시작
        </button>
      </div>

      <div className="panel learn-panel">
        <h2>📖 이번 판에서 배운 물리</h2>
        {summary && (
          <ul className="summary-list">
            {summaryLines(summary).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <QuizPanel questions={questions} onAnswer={onAnswer} />
      </div>

      <div className="panel side-panel">{leaderboardSlot}</div>
    </div>
  );
}
