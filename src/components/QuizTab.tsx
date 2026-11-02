import { useState } from "react";
import type { Chunk } from "../lib/chunk";
import { makeQuiz, type QuizQuestion } from "../lib/study";
import { NeedsKey } from "./NeedsKey";

interface Props {
  apiKey: string | null;
  chunks: Chunk[];
}

export function QuizTab({ apiKey, chunks }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!apiKey) return <NeedsKey what="gerar o quiz" />;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const qs = await makeQuiz(apiKey!, chunks);
      setQuestions(qs);
      setAnswers(qs.map(() => null));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const done = answers.length > 0 && answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === questions[i]?.correct).length;

  return (
    <div className="quiz">
      {!questions.length && (
        <button onClick={generate} disabled={loading}>
          {loading ? "Gerando…" : "Gerar quiz"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
      <ol>
        {questions.map((q, i) => (
          <li key={i} className="question">
            <p className="q">{q.question}</p>
            <div className="options">
              {q.options.map((opt, j) => {
                const chosen = answers[i];
                const state =
                  chosen === null ? "" : j === q.correct ? "right" : j === chosen ? "wrong" : "dim";
                return (
                  <button
                    key={j}
                    className={`option ${state}`}
                    disabled={chosen !== null}
                    onClick={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {answers[i] !== null && (
              <p className="muted">
                {q.explanation} (p. {q.page})
              </p>
            )}
          </li>
        ))}
      </ol>
      {done && (
        <div className="row">
          <strong>Você acertou {score} de {questions.length}.</strong>
          <button className="link" onClick={generate} disabled={loading}>novo quiz</button>
        </div>
      )}
    </div>
  );
}
