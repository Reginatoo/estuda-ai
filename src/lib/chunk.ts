import type { PageText } from "./pdf";

export interface Chunk {
  id: number;
  page: number;
  text: string;
  embedding?: number[];
}

/**
 * Divide o texto de cada página em pedaços de ~`size` caracteres,
 * com uma sobreposição (`overlap`) para não cortar uma ideia no meio.
 * Cada pedaço guarda a página de origem, para a resposta poder citar a fonte.
 */
export function chunkPages(pages: PageText[], size = 900, overlap = 150): Chunk[] {
  const chunks: Chunk[] = [];
  let id = 0;

  for (const { page, text } of pages) {
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);
      // tenta terminar no fim de uma frase para o pedaço ficar legível
      if (end < text.length) {
        const lastDot = text.lastIndexOf(". ", end);
        if (lastDot > start + size * 0.5) end = lastDot + 1;
      }
      chunks.push({ id: id++, page, text: text.slice(start, end).trim() });
      if (end >= text.length) break;
      start = end - overlap;
    }
  }
  return chunks;
}
