import type { Chunk } from "./chunk";
import { embed, generate, type AI } from "./gemini";
import { topKByEmbedding, topKByKeywords } from "./search";

export interface Answer {
  text: string;
  sources: Chunk[];
}

export interface Flashcard {
  front: string;
  back: string;
  page: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  page: number;
}

/** Indexa o documento: calcula o embedding de cada pedaço. */
export async function indexChunks(ai: AI, chunks: Chunk[]): Promise<Chunk[]> {
  const vectors = await embed(ai.key, chunks.map((c) => c.text), "RETRIEVAL_DOCUMENT");
  return chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
}

/** Encontra os pedaços mais relevantes para a pergunta (a parte "R" do RAG). */
export async function retrieve(ai: AI | null, question: string, chunks: Chunk[], k = 5) {
  const hasEmbeddings = chunks.some((c) => c.embedding);
  if (ai && hasEmbeddings) {
    const [q] = await embed(ai.key, [question], "RETRIEVAL_QUERY");
    return topKByEmbedding(q, chunks, k);
  }
  return topKByKeywords(question, chunks, k);
}

function context(sources: Chunk[]) {
  return sources.map((c) => `[p. ${c.page}] ${c.text}`).join("\n\n");
}

/** Responde usando SOMENTE os trechos encontrados, citando as páginas. */
export async function ask(ai: AI | null, question: string, chunks: Chunk[]): Promise<Answer> {
  const sources = await retrieve(ai, question, chunks);
  if (!sources.length) {
    return { text: "Não encontrei nada sobre isso no documento.", sources };
  }
  if (!ai) {
    return {
      text: "Modo demonstração (sem IA): estes são os trechos mais parecidos com a sua pergunta.",
      sources,
    };
  }
  const prompt = `Você é um assistente de estudos. Responda à pergunta em português usando APENAS os trechos abaixo.
Cite a página no formato (p. N) depois de cada informação.
Se a resposta não estiver nos trechos, diga claramente que o material não cobre isso. Não invente.

TRECHOS:
${context(sources)}

PERGUNTA: ${question}`;
  return { text: await generate(ai.key, prompt), sources };
}

function sample(chunks: Chunk[], n: number): Chunk[] {
  if (chunks.length <= n) return chunks;
  const step = chunks.length / n;
  return Array.from({ length: n }, (_, i) => chunks[Math.floor(i * step)]);
}

export async function makeFlashcards(ai: AI, chunks: Chunk[], n = 8): Promise<Flashcard[]> {
  const prompt = `Crie ${n} flashcards de estudo em português a partir do material abaixo.
Cada card tem uma pergunta curta (front), a resposta (back) e a página de origem (page).
Responda só com JSON: [{"front": "...", "back": "...", "page": 1}]

MATERIAL:
${context(sample(chunks, 12))}`;
  return JSON.parse(await generate(ai.key, prompt, true));
}

export async function makeQuiz(ai: AI, chunks: Chunk[], n = 5): Promise<QuizQuestion[]> {
  const prompt = `Crie ${n} questões de múltipla escolha em português a partir do material abaixo.
Cada questão tem 4 alternativas, o índice da correta (0 a 3), uma explicação curta e a página de origem.
Responda só com JSON: [{"question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": "...", "page": 1}]

MATERIAL:
${context(sample(chunks, 12))}`;
  return JSON.parse(await generate(ai.key, prompt, true));
}
