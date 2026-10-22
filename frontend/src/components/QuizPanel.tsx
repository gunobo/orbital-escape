import { useState } from "react";
import { CONCEPT_BY_ID, type ConceptId } from "../learning/concepts";
import type { Question } from "../learning/quiz";

interface Props {
  questions: Question[];
  onAnswer: (concept: ConceptId, correct: boolean) => void;
}

/** 한 문제씩 푸는 복습 퀴즈. 풀고 나면 바로 해설을 보여 준다. */
export default function QuizPanel({ questions, onAnswer }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) return null;
  if (index >= questions.length) {
    return (
      <div className="quiz">
        <div className="quiz-done">
          복습 완료! {questions.length}문제 중 <b>{score}</b>문제 정답 🎉
        </div>
      </div>
    );
  }

  const q = questions[index];
  const answered = picked !== null;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const correct = i === q.answer;
    if (correct) setScore((s) => s + 1);
    onAnswer(q.concept, correct);
  };

  return (
    <div className="quiz">
      <div className="quiz-head">
        <span>
          📝 복습 퀴즈 {index + 1}/{questions.length}
        </span>
        <span className="quiz-concept">
          {CONCEPT_BY_ID[q.concept].icon} {CONCEPT_BY_ID[q.concept].title}
        </span>
      </div>
      <div className="quiz-text">{q.text}</div>
      <div className="quiz-choices">
        {q.choices.map((c, i) => {
          const state = !answered ? "" : i === q.answer ? " quiz-right" : i === picked ? " quiz-wrong" : " quiz-dim";
          return (
            <button key={i} className={"quiz-choice" + state} onClick={() => choose(i)} disabled={answered && i !== picked && i !== q.answer}>
              {c}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={"quiz-explain " + (picked === q.answer ? "ok" : "no")}>
          <b>{picked === q.answer ? "정답!" : "아쉬워요."}</b> {q.explain}
          <div>
            <button
              className="ghost-btn"
              onClick={() => {
                setPicked(null);
                setIndex((i) => i + 1);
              }}
            >
              {index + 1 < questions.length ? "다음 문제" : "결과 보기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
