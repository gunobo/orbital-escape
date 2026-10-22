import { CONCEPTS } from "../learning/concepts";
import { VIEW_ORDER, VIEWS } from "../constants/camera";

interface Props {
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseOverlay({ onResume, onQuit }: Props) {
  return (
    <div className="pause-overlay">
      <div className="pause-card">
        <h1>⏸ 일시정지</h1>
        <p className="subtitle">쉬는 동안 위의 시점 버튼을 눌러 물체를 살펴보고, 물리 패널로 개념을 확인해 보세요.</p>

        <div className="pause-cols">
          <div>
            <h3>조작</h3>
            <ul className="rules">
              <li>🖱 <b>마우스 조종</b>: 화면의 고리를 가리키면 우주선이 그쪽으로 날아가요 (M: 키보드 조종으로 전환)</li>
              <li>⌨ 방향키/WASD: 직접 가속 · Shift: 부스트</li>
              <li>Space / P / Esc: 일시정지 · H: 물리 패널 · Z: 관성 제어</li>
              <li>
                시점 (C 또는 숫자키): {VIEW_ORDER.map((id, i) => `${i + 1} ${VIEWS[id].label}`).join(" · ")}
              </li>
              <li>목숨 3개: 게이트를 놓치면 -1, 운석에 부딪히면 즉시 종료</li>
            </ul>
          </div>
          <div>
            <h3>이 게임에서 배우는 것</h3>
            <ul className="concept-mini">
              {CONCEPTS.map((c) => (
                <li key={c.id}>
                  <b>
                    {c.icon} {c.title}
                  </b>{" "}
                  <code>{c.formula}</code>
                  <div>{c.summary}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pause-actions">
          <button className="primary-btn" onClick={onResume}>
            계속하기
          </button>
          <button className="ghost-btn" onClick={onQuit}>
            처음 화면으로
          </button>
        </div>
      </div>
    </div>
  );
}
