export interface Hint {
  id: string;
  title: string;
  tone?: "science" | "warn";
}

/** 한 줄짜리 알림. 글이 길어지면 게임에 방해되므로 제목만 보여 준다. */
export default function HintToast({ hint }: { hint: Hint | null }) {
  if (!hint) return null;
  return (
    <div className={"hint-toast" + (hint.tone === "warn" ? " hint-warn" : "")} key={hint.id}>
      {hint.title}
    </div>
  );
}
