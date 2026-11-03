/**
 * Função serverless (Vercel) que fala com o Gemini usando a chave do dono do site.
 * A chave fica na variável de ambiente GEMINI_API_KEY e nunca chega ao navegador.
 *
 * Proteções:
 * - só repassa as 3 operações que o app usa (listar modelos, gerar texto, gerar embeddings);
 * - só aceita modelos Flash/Flash-Lite e de embeddings (os mais baratos);
 * - limita o tamanho do pedido e o número de pedidos por visitante.
 */

declare const process: { env: Record<string, string | undefined> };

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const MAX_PER_WINDOW = 60; // pedidos por visitante por hora
const MAX_BODY = 200_000; // ~200 KB por pedido

const hits = new Map<string, { count: number; start: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(ip, { count: 1, start: now });
    return false;
  }
  h.count++;
  return h.count > MAX_PER_WINDOW;
}

const ALLOWED = [
  /^models\?pageSize=\d+$/,
  /^models\/gemini-[\d.]+-flash(-lite)?:generateContent$/,
  /^models\/gemini-flash(-lite)?-latest:generateContent$/,
  /^models\/[a-z0-9.-]*embedding[a-z0-9.-]*:batchEmbedContents$/,
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** GET /api/gemini → diz ao site se a IA do servidor está disponível. */
export function GET() {
  return json({ enabled: Boolean(process.env.GEMINI_API_KEY) });
}

/** POST /api/gemini { path, body? } → repassa para o Gemini. */
export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "IA do servidor não configurada." }, 503);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  if (rateLimited(ip)) {
    return json({ error: "Limite de uso atingido. Tente de novo mais tarde ou use sua própria chave." }, 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "Pedido grande demais." }, 413);

  let payload: { path?: string; body?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  const path = payload.path ?? "";
  if (!ALLOWED.some((re) => re.test(path))) return json({ error: "Operação não permitida." }, 403);

  const res = await fetch(`${BASE}/${path}`, {
    method: payload.body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: payload.body === undefined ? undefined : JSON.stringify(payload.body),
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
