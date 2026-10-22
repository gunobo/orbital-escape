import { CONCEPTS } from "../learning/concepts";
import { isMastered, masteredCount, MASTERY_CORRECT, type Progress } from "../learning/progress";
import { ConceptIcon } from "./Icons";

/** 시작 화면의 학습 진행도: 개념마다 퀴즈를 맞히면 표시가 켜진다 */
export default function ConceptBadges({ progress }: { progress: Progress }) {
  return (
    <div className="badges">
      <h2>
        이해한 개념 <span className="num">{masteredCount(progress)}/{CONCEPTS.length}</span>
      </h2>
      <div className="badge-grid">
        {CONCEPTS.map((c) => {
          const done = isMastered(progress, c.id);
          return (
            <div key={c.id} className={"badge" + (done ? " badge-on" : "")} title={`${c.summary}\n${c.formula}`}>
              <ConceptIcon id={c.id} size={14} />
              <span>{c.title}</span>
              <span className="num">{done ? "완료" : `${progress[c.id].correct}/${MASTERY_CORRECT}`}</span>
            </div>
          );
        })}
      </div>
      <p className="note">게임이 끝난 뒤 복습 퀴즈를 {MASTERY_CORRECT}번 맞히면 완료로 바뀌어요.</p>
    </div>
  );
}
