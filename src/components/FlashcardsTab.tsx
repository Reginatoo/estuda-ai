import { useState } from "react";
import type { Chunk } from "../lib/chunk";
import { makeFlashcards, type Flashcard } from "../lib/study";
import { NeedsKey } from "./NeedsKey";

interface Props {
  apiKey: string | null;
  chunks: Chunk[];
}

export function FlashcardsTab({ apiKey, chunks }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!apiKey) return <NeedsKey what="gerar flashcards" />;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setCards(await makeFlashcards(apiKey!, chunks));
      setIndex(0);
      setFlipped(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const card = cards[index];

  return (
    <div className="cards">
      {!cards.length && (
        <button onClick={generate} disabled={loading}>
          {loading ? "Gerando…" : "Gerar flashcards"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
      {card && (
        <>
          <button className={`flash ${flipped ? "back" : ""}`} onClick={() => setFlipped((f) => !f)}>
            <span className="side">{flipped ? "Resposta" : "Pergunta"} · p. {card.page}</span>
            <span className="body">{flipped ? card.back : card.front}</span>
            <span className="muted">clique para virar</span>
          </button>
          <div className="row">
            <button disabled={index === 0} onClick={() => { setIndex(index - 1); setFlipped(false); }}>←</button>
            <span>{index + 1} / {cards.length}</span>
            <button disabled={index === cards.length - 1} onClick={() => { setIndex(index + 1); setFlipped(false); }}>→</button>
            <button className="link" onClick={generate} disabled={loading}>gerar outros</button>
          </div>
        </>
      )}
    </div>
  );
}
