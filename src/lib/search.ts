import type { Chunk } from "./chunk";

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** Busca semântica: compara o embedding da pergunta com o de cada pedaço. */
export function topKByEmbedding(query: number[], chunks: Chunk[], k = 5): Chunk[] {
  return chunks
    .filter((c) => c.embedding)
    .map((c) => ({ c, score: cosine(query, c.embedding!) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map((x) => x.c);
}

const STOPWORDS = new Set(
  "a o e de da do das dos em no na nos nas um uma uns umas que para por com como se ao à às os as é ser foi são mais mas ou sua seu suas seus isso esta este essa esse qual quais quando onde".split(" ")
);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Busca por palavras-chave (BM25 simplificado). Usada no modo demonstração,
 * sem chave de API, e como plano B se a API de embeddings falhar.
 */
export function topKByKeywords(query: string, chunks: Chunk[], k = 5): Chunk[] {
  const q = tokens(query);
  const docs = chunks.map((c) => tokens(c.text));
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);

  const k1 = 1.5, b = 0.75, N = docs.length;
  return chunks
    .map((c, i) => {
      const d = docs[i];
      let score = 0;
      for (const t of q) {
        const tf = d.filter((x) => x === t).length;
        if (!tf) continue;
        const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.length) / avgLen)));
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map((x) => x.c);
}
