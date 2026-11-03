import { CornersIn, CornersOut, Cursor, Flask, GameController, HandPointing, Keyboard, Pause } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { fullscreenSupported, isFullscreen, IS_TOUCH, toggleFullscreen } from "../hooks/touch";
import { VIEW_ORDER, VIEWS, type ViewId } from "../constants/camera";
import type { PhysicsView } from "../constants/physicsView";
import type { ControlMode } from "./Scene";

const PHYSICS_LABEL: Record<PhysicsView, string> = { off: "", arrows: "화살표", full: "화살표+패널" };

interface Props {
  view: ViewId;
  onView: (view: ViewId) => void;
  controlMode: ControlMode;
  onControlMode: (mode: ControlMode) => void;
  physicsView: PhysicsView;
  onCyclePhysics: () => void;
  inertialControl: boolean;
  onToggleInertial: () => void;
  onPause: () => void;
}

/** 화면 아래 중앙의 조작 막대. 글자는 최소로 하고, 자세한 설명은 마우스를 올리면(툴팁) 나온다. */
export default function ControlBar({
  view,
  onView,
  controlMode,
  onControlMode,
  physicsView,
  onCyclePhysics,
  inertialControl,
  onToggleInertial,
  onPause,
}: Props) {
  // 버튼을 누른 뒤 포커스가 남으면 Space/Enter가 그 버튼을 또 눌러 버린다
  const press = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    fn();
    e.currentTarget.blur();
  };
  const [fullscreen, setFullscreen] = useState(isFullscreen);
  useEffect(() => {
    const onChange = () => setFullscreen(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  const AimIcon = IS_TOUCH ? HandPointing : Cursor;
  const PadIcon = IS_TOUCH ? GameController : Keyboard;
  return (
    <div className="control-bar">
      <button className="cb-btn" onClick={press(onPause)} title="일시정지 (Space)" aria-label="일시정지">
        <Pause size={16} weight="fill" />
      </button>
      <span className="cb-group" title="시점 전환 (C 또는 1~5)">
        {VIEW_ORDER.map((id, i) => (
          <button key={id} className={"cb-btn" + (view === id ? " cb-on" : "")} onClick={press(() => onView(id))} title={`${VIEWS[id].label}: ${VIEWS[id].hint}`}>
            {view === id ? `${i + 1} ${VIEWS[id].label}` : i + 1}
          </button>
        ))}
      </span>
      <button
        className={"cb-btn" + (controlMode === "mouse" ? " cb-on" : "")}
        onClick={press(() => onControlMode(controlMode === "mouse" ? "keyboard" : "mouse"))}
        title="조종 방식 (M): 마우스로 가리키면 그쪽으로 날아가요"
        aria-label="조종 방식 전환"
      >
        {controlMode === "mouse" ? <AimIcon size={18} weight="fill" /> : <PadIcon size={18} />}
      </button>
      <button className={"cb-btn" + (inertialControl ? " cb-on" : "")} onClick={press(onToggleInertial)} title="관성 제어(자동 제동) 켜기/끄기 (Z)">
        제동 {inertialControl ? "ON" : "OFF"}
      </button>
      <button className={"cb-btn" + (physicsView !== "off" ? " cb-on" : "")} onClick={press(onCyclePhysics)} title="물리 보기 전환 (H): 끔, 화살표, 화살표+패널" aria-label="물리 보기">
        <Flask size={16} /> {PHYSICS_LABEL[physicsView]}
      </button>
      {IS_TOUCH && fullscreenSupported() && (
        <button className={"cb-btn" + (fullscreen ? " cb-on" : "")} onClick={press(toggleFullscreen)} aria-label="전체 화면">
          {fullscreen ? <CornersIn size={18} /> : <CornersOut size={18} />}
        </button>
      )}
    </div>
  );
}
