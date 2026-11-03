/** 태블릿·휴대폰처럼 손가락으로 조작하는 기기인지. 앱이 켜질 때 한 번만 판단한다. */
export const IS_TOUCH: boolean =
  typeof window !== "undefined" &&
  ((window.matchMedia?.("(any-pointer: coarse)").matches ?? false) || navigator.maxTouchPoints > 0);

type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export function fullscreenSupported(): boolean {
  const d = document as FsDoc;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

/** 전체 화면을 켜거나 끈다. 주소창이 사라져 화면을 더 넓게 쓸 수 있다 */
export function toggleFullscreen(): void {
  const d = document as FsDoc;
  const el = document.documentElement as FsEl;
  try {
    if (isFullscreen()) {
      if (d.exitFullscreen) void d.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => {});
    } else {
      el.webkitRequestFullscreen?.();
    }
  } catch {
    /* 지원하지 않으면 무시 */
  }
}
