import { useState } from "react";
import { extractPages } from "./lib/pdf";
import { chunkPages, type Chunk } from "./lib/chunk";
import { indexChunks } from "./lib/study";
import { AskTab } from "./components/AskTab";
import { FlashcardsTab } from "./components/FlashcardsTab";
import { QuizTab } from "./components/QuizTab";
import { ApiKeyField } from "./components/ApiKeyField";

type Tab = "ask" | "cards" | "quiz";

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem("gemini_key");
    } catch {
      return null;
    }
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ask");

  async function onFile(file: File) {
    setError(null);
    setChunks([]);
    setFileName(file.name);
    try {
      setStatus("Lendo o PDF…");
      const pageTexts = await extractPages(file);
      if (!pageTexts.length) throw new Error("Não encontrei texto nesse PDF (pode ser um PDF escaneado, só com imagem).");
      setPages(pageTexts.length);
      let parts = chunkPages(pageTexts);
      if (apiKey) {
        setStatus(`Indexando ${parts.length} trechos com IA…`);
        try {
          parts = await indexChunks(apiKey, parts);
        } catch (e) {
          setError(`Não consegui gerar os embeddings (${(e as Error).message}). Vou usar busca por palavras-chave.`);
        }
      }
      setChunks(parts);
      setStatus(null);
    } catch (e) {
      setStatus(null);
      setError((e as Error).message);
    }
  }

  const ready = chunks.length > 0;
  const semantic = chunks.some((c) => c.embedding);

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>✦</span>
          <div>
            <h1>EstudaAí</h1>
            <p className="tagline">Converse com o seu material de estudo, com a fonte de cada resposta.</p>
          </div>
        </div>
        <ApiKeyField value={apiKey} onChange={setApiKey} />
      </header>

      <section className="card upload">
        <label className="drop">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // permite escolher o mesmo arquivo de novo
              if (file) onFile(file);
            }}
          />
          <strong>{fileName ?? "Escolha um PDF"}</strong>
          <span>
            {ready
              ? `${pages} páginas · ${chunks.length} trechos · busca ${semantic ? "semântica (embeddings)" : "por palavras-chave"}`
              : "Apostila, slides exportados, artigo… O arquivo é lido no seu navegador."}
          </span>
        </label>
        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {ready && (
        <>
          <nav className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "ask"} onClick={() => setTab("ask")}>Perguntar</button>
            <button role="tab" aria-selected={tab === "cards"} onClick={() => setTab("cards")}>Flashcards</button>
            <button role="tab" aria-selected={tab === "quiz"} onClick={() => setTab("quiz")}>Quiz</button>
          </nav>
          <main className="card">
            {tab === "ask" && <AskTab apiKey={apiKey} chunks={chunks} />}
            {tab === "cards" && <FlashcardsTab apiKey={apiKey} chunks={chunks} />}
            {tab === "quiz" && <QuizTab apiKey={apiKey} chunks={chunks} />}
          </main>
        </>
      )}

      <footer className="foot">
        Feito por Lucas Reginato com React, TypeScript e Gemini · RAG no navegador
      </footer>
    </div>
  );
}
