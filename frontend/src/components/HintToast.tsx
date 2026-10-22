export interface Hint {
  id: string;
  title: string;
  tone?: "science" | "warn";
  /** 화면에 머무는 시간(ms). 끝나기 직전에 서서히 사라진다 */
  life?: number;
}

/** 한 줄짜리 알림. 글이 길어지면 게임에 방해되므로 제목만 보여 준다. */
export default function HintToast({ hint }: { hint: Hint | null }) {
  if (!hint) return null;
  return (
    <div
      className={"hint-toast" + (hint.tone === "warn" ? " hint-warn" : "")}
      key={hint.id}
      style={{ "--life": `${hint.life ?? 5000}ms` } as React.CSSProperties}
    >
      {hint.title}
    </div>
  );
}
