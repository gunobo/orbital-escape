import { CONCEPTS } from "../learning/concepts";
import { isMastered, masteredCount, MASTERY_CORRECT, type Progress } from "../learning/progress";

/** 시작 화면의 학습 진행도: 개념마다 퀴즈를 맞히면 배지가 켜진다 */
export default function ConceptBadges({ progress }: { progress: Progress }) {
  return (
    <div className="badges">
      <div className="badges-title">
        📚 내가 이해한 개념 <b>{masteredCount(progress)}/{CONCEPTS.length}</b>
        <span> (게임 후 복습 퀴즈를 {MASTERY_CORRECT}번 맞히면 ✓)</span>
      </div>
      <div className="badge-grid">
        {CONCEPTS.map((c) => (
          <div key={c.id} className={"badge" + (isMastered(progress, c.id) ? " badge-on" : "")} title={`${c.summary}\n${c.formula}`}>
            <span>{c.icon}</span> {c.title}
            <small>{isMastered(progress, c.id) ? " ✓" : ` ${progress[c.id].correct}/${MASTERY_CORRECT}`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
