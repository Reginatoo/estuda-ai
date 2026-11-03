import { useState } from "react";
import Markdown from "react-markdown";
import type { Chunk } from "../lib/chunk";
import { ask, type Answer } from "../lib/study";

interface Props {
  apiKey: string | null;
  chunks: Chunk[];
}

interface Turn {
  question: string;
  answer?: Answer;
  error?: string;
}

export function AskTab({ apiKey, chunks }: Props) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setLoading(true);
    setTurns((t) => [...t, { question: q }]);
    try {
      const answer = await ask(apiKey, q, chunks);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: (e as Error).message } : x)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ask">
      {turns.length === 0 && (
        <p className="hint">Pergunte qualquer coisa sobre o material. Ex.: “Qual a diferença entre pilha e fila?”</p>
      )}
      <ol className="thread">
        {turns.map((t, i) => (
          <li key={i}>
            <p className="q">{t.question}</p>
            {!t.answer && !t.error && <p className="muted">Pensando…</p>}
            {t.error && <p className="error">{t.error}</p>}
            {t.answer && (
              <>
                <div className="a">
                  <Markdown>{t.answer.text}</Markdown>
                </div>
                {t.answer.sources.length > 0 && (
                  <details className="sources">
                    <summary>Trechos usados ({t.answer.sources.length})</summary>
                    {t.answer.sources.map((s) => (
                      <blockquote key={s.id}>
                        <span className="pg">p. {s.page}</span> {s.text}
                      </blockquote>
                    ))}
                  </details>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Sua pergunta…"
          aria-label="Pergunta"
        />
        <button disabled={loading || !question.trim()}>Perguntar</button>
      </form>
    </div>
  );
}
