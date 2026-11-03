import { CaretDown, CaretLeft, CaretRight, CaretUp, Lightning } from "@phosphor-icons/react";
import { useEffect } from "react";
import { releaseVirtualControls, virtualControls, type ControlState } from "../hooks/useControls";

/**
 * 태블릿용 화면 버튼. 누르고 있는 동안만 켜진다(키보드 키를 누르고 있는 것과 같다).
 * - 방향 버튼: '버튼' 조종 방식일 때 왼쪽 아래에 나온다
 * - 가속 버튼: 언제나 오른쪽 아래에 있다 (Shift 와 같음)
 */
function HoldButton({ k, className, label, children }: { k: keyof ControlState; className: string; label: string; children: React.ReactNode }) {
  const set = (on: boolean) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    virtualControls[k] = on;
    if (on) e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.classList.toggle("tc-held", on);
  };
  return (
    <button
      type="button"
      className={"tc-btn " + className}
      aria-label={label}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onLostPointerCapture={set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export default function TouchControls({ showPad }: { showPad: boolean }) {
  useEffect(() => releaseVirtualControls, [showPad]);

  return (
    <>
      {showPad && (
        <div className="touch-pad">
          <HoldButton k="up" className="tc-up" label="위로">
            <CaretUp size={30} weight="bold" />
          </HoldButton>
          <HoldButton k="left" className="tc-left" label="왼쪽으로">
            <CaretLeft size={30} weight="bold" />
          </HoldButton>
          <HoldButton k="right" className="tc-right" label="오른쪽으로">
            <CaretRight size={30} weight="bold" />
          </HoldButton>
          <HoldButton k="down" className="tc-down" label="아래로">
            <CaretDown size={30} weight="bold" />
          </HoldButton>
        </div>
      )}
      <HoldButton k="boost" className="tc-boost" label="가속 (누르고 있기)">
        <Lightning size={30} weight="fill" />
        <span>가속</span>
      </HoldButton>
    </>
  );
}
