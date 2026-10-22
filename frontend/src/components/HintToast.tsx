export interface Hint {
  id: string;
  title: string;
  text: string;
  tone?: "science" | "warn";
}

export default function HintToast({ hint }: { hint: Hint | null }) {
  if (!hint) return null;
  return (
    <div className={"hint-toast" + (hint.tone === "warn" ? " hint-warn" : "")} key={hint.id}>
      <div className="hint-title">{hint.title}</div>
      <div className="hint-text">{hint.text}</div>
    </div>
  );
}
