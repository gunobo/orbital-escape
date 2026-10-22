import { CONCEPTS } from "../learning/concepts";

interface Props {
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseOverlay({ onResume, onQuit }: Props) {
  return (
    <div className="pause-overlay">
      <div className="pause-card">
        <h1>⏸ 일시정지</h1>

        <ul className="keys">
          <li><kbd>마우스</kbd> 고리를 가리키기</li>
          <li><kbd>C</kbd> 시점</li>
          <li><kbd>H</kbd> 물리 보기</li>
          <li><kbd>Z</kbd> 제동</li>
          <li><kbd>Space</kbd> 일시정지</li>
        </ul>

        <div className="concept-chips">
          {CONCEPTS.map((c) => (
            <span key={c.id} title={c.summary}>
              {c.icon} {c.title} <code>{c.formula}</code>
            </span>
          ))}
        </div>

        <div className="pause-actions">
          <button className="primary-btn" onClick={onResume}>
            계속하기
          </button>
          <button className="ghost-btn" onClick={onQuit}>
            처음으로
          </button>
        </div>
      </div>
    </div>
  );
}
