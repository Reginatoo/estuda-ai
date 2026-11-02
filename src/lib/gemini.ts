const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Usados só se a lista de modelos não puder ser consultada.
const FALLBACK_CHAT = "gemini-flash-latest";
const FALLBACK_EMBED = "gemini-embedding-001";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Faz a chamada à API. Se o Gemini estiver sobrecarregado (503) ou limitando
 * requisições (429), tenta de novo esperando 1s, 2s e 4s (backoff exponencial).
 */
async function call<T>(apiKey: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return res.json() as Promise<T>;
    if ([429, 500, 503].includes(res.status) && attempt < 3) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.status === 503) throw new Error("O Gemini está sobrecarregado agora. Tente de novo em alguns segundos.");
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }
}

interface ModelInfo {
  name: string; // ex.: "models/gemini-2.5-flash"
  supportedGenerationMethods?: string[];
}

/** Extrai o número da versão do nome do modelo ("gemini-3.8-flash" -> 3.8). */
function version(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

const cache = new Map<string, Promise<{ chat: string; embed: string }>>();

/**
 * Os modelos do Gemini são aposentados com o tempo. Em vez de fixar um nome no
 * código, consultamos a API e escolhemos o "flash" estável mais novo e o modelo
 * de embeddings disponível para a chave do usuário.
 */
export function pickModels(apiKey: string) {
  if (!cache.has(apiKey)) cache.set(apiKey, (async () => {
    try {
      const { models = [] } = await call<{ models?: ModelInfo[] }>(apiKey, "models?pageSize=1000");
      const ids = (m: ModelInfo) => m.name.replace(/^models\//, "");
      const unstable = /(preview|exp|lite|image|tts|audio|live|thinking|8b)/;

      const chat = models
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map(ids)
        .filter((id) => /^gemini-\d/.test(id) && id.includes("flash") && !unstable.test(id))
        .sort((a, b) => version(b) - version(a) || a.length - b.length)[0];

      const embed = models
        .filter((m) => m.supportedGenerationMethods?.some((g) => g.includes("mbed")))
        .map(ids)
        .sort((a, b) => Number(b.startsWith("gemini-embedding")) - Number(a.startsWith("gemini-embedding")))[0];

      return { chat: chat ?? FALLBACK_CHAT, embed: embed ?? FALLBACK_EMBED };
    } catch {
      return { chat: FALLBACK_CHAT, embed: FALLBACK_EMBED };
    }
  })());
  return cache.get(apiKey)!;
}

/** Gera embeddings (vetores que representam o significado do texto), em lotes de até 100. */
export async function embed(
  apiKey: string,
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  const { embed: model } = await pickModels(apiKey);
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const data = await call<{ embeddings: { values: number[] }[] }>(
      apiKey,
      `models/${model}:batchEmbedContents`,
      {
        requests: batch.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
        })),
      }
    );
    out.push(...data.embeddings.map((e) => e.values));
  }
  return out;
}

/** Chama o modelo de linguagem. Com `json: true`, pede a resposta já em JSON. */
export async function generate(apiKey: string, prompt: string, json = false): Promise<string> {
  const { chat: model } = await pickModels(apiKey);
  const data = await call<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
    apiKey,
    `models/${model}:generateContent`,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }
  );
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}
