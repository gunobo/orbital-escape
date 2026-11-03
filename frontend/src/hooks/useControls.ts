import { useEffect, useRef } from "react";

export interface ControlState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
}

const KEY_MAP: Record<string, keyof ControlState> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ShiftLeft: "boost",
  ShiftRight: "boost",
};

/** 화면 버튼(태블릿)으로 누른 상태. 키보드 입력과 합쳐서 쓴다 */
export const virtualControls: ControlState = {
  up: false,
  down: false,
  left: false,
  right: false,
  boost: false,
};

export function releaseVirtualControls() {
  virtualControls.up = virtualControls.down = virtualControls.left = virtualControls.right = virtualControls.boost = false;
}

export function useControls() {
  const stateRef = useRef<ControlState>({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
  });

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (key) {
        stateRef.current[key] = true;
        e.preventDefault();
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (key) {
        stateRef.current[key] = false;
        e.preventDefault();
      }
    };
    const handleBlur = () => {
      stateRef.current = { up: false, down: false, left: false, right: false, boost: false };
      releaseVirtualControls();
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return stateRef;
}
