import { VIEW_ORDER, VIEWS, type ViewId } from "../constants/camera";
import type { ControlMode } from "./Scene";

interface Props {
  view: ViewId;
  onView: (view: ViewId) => void;
  controlMode: ControlMode;
  onControlMode: (mode: ControlMode) => void;
  showPhysics: boolean;
  onTogglePhysics: () => void;
  inertialControl: boolean;
  onToggleInertial: () => void;
  onPause: () => void;
}

/** 화면 위쪽 중앙의 조작 막대 (마우스로 눌러도 되고, 괄호 안의 키로도 된다) */
export default function ControlBar({
  view,
  onView,
  controlMode,
  onControlMode,
  showPhysics,
  onTogglePhysics,
  inertialControl,
  onToggleInertial,
  onPause,
}: Props) {
  // 버튼을 누른 뒤 포커스가 남으면 Space/Enter가 그 버튼을 또 눌러 버린다
  const press = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    fn();
    e.currentTarget.blur();
  };
  return (
    <div className="control-bar">
      <button className="cb-btn" onClick={press(onPause)} title="일시정지 (Space / P / Esc)">
        ⏸ 일시정지
      </button>
      <span className="cb-group" title="시점 전환 (C 또는 1~5)">
        {VIEW_ORDER.map((id, i) => (
          <button key={id} className={"cb-btn" + (view === id ? " cb-on" : "")} onClick={press(() => onView(id))} title={VIEWS[id].hint}>
            {i + 1} {VIEWS[id].label}
          </button>
        ))}
      </span>
      <span className="cb-group">
        <button
          className={"cb-btn" + (controlMode === "mouse" ? " cb-on" : "")}
          onClick={press(() => onControlMode(controlMode === "mouse" ? "keyboard" : "mouse"))}
          title="조종 방식 전환 (M): 마우스로 가리키면 그쪽으로 날아가요"
        >
          {controlMode === "mouse" ? "🖱 마우스 조종" : "⌨ 키보드 조종"}
        </button>
        <button className={"cb-btn" + (inertialControl ? " cb-on" : "")} onClick={press(onToggleInertial)} title="관성 제어(자동 제동) 켜기/끄기 (Z)">
          관성 제어 {inertialControl ? "ON" : "OFF"}
        </button>
        <button className={"cb-btn" + (showPhysics ? " cb-on" : "")} onClick={press(onTogglePhysics)} title="물리 패널·힘 화살표 (H)">
          🔬 물리
        </button>
      </span>
    </div>
  );
}
