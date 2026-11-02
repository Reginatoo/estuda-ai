const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const CHAT_MODEL = "gemini-2.5-flash";
export const EMBED_MODEL = "gemini-embedding-001";

async function call<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Gera embeddings (vetores que representam o significado do texto), em lotes de até 100. */
export async function embed(
  apiKey: string,
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const data = await call<{ embeddings: { values: number[] }[] }>(
      apiKey,
      `models/${EMBED_MODEL}:batchEmbedContents`,
      {
        requests: batch.map((text) => ({
          model: `models/${EMBED_MODEL}`,
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
  const data = await call<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
    apiKey,
    `models/${CHAT_MODEL}:generateContent`,
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
