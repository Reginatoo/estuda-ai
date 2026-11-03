# EstudaAí

**App no ar:** https://estuda-ai-teal.vercel.app

Assistente de estudos com IA: você envia o PDF de uma aula ou apostila e pode
**fazer perguntas sobre o material** (com a página de onde veio cada resposta),
**gerar flashcards** e **fazer um quiz**.

Feito com React + TypeScript, rodando 100% no navegador, usando a API do Google Gemini.
Desenvolvido por Lucas Reginato com apoio de IA (Claude) na escrita do código.

## Como funciona (RAG)

RAG = *Retrieval-Augmented Generation*: em vez de perguntar direto para o modelo
(que pode inventar), primeiro buscamos os trechos certos do documento e só então
pedimos a resposta, usando apenas esses trechos.

```
PDF ──► extrair texto por página ──► dividir em trechos ──► embeddings
                                                              │
pergunta ──► embedding da pergunta ──► similaridade de cosseno ┘
                                          │
                              5 trechos mais relevantes
                                          │
                     prompt: "responda só com estes trechos, cite a página"
                                          │
                                   resposta + fontes
```

| Etapa | Arquivo | O que faz |
|---|---|---|
| Leitura do PDF | `src/lib/pdf.ts` | Usa o pdf.js para extrair o texto de cada página |
| Divisão em trechos | `src/lib/chunk.ts` | Pedaços de ~900 caracteres com 150 de sobreposição, terminando em fim de frase |
| Embeddings | `src/lib/gemini.ts` | Converte cada trecho num vetor com o modelo de embeddings do Gemini, em lotes de 100 |
| Busca | `src/lib/search.ts` | Similaridade de cosseno; BM25 (palavras-chave) como plano B |
| Geração | `src/lib/study.ts` | Monta os prompts de resposta, flashcards e quiz (modelo Gemini Flash, saída em JSON) |

### Decisões e limitações

- **Sem servidor:** tudo roda no navegador e a chave da API fica no `localStorage`
  de quem usa. É simples e barato para um projeto pessoal; num produto real a
  chave ficaria num backend.
- **Modo demonstração:** sem chave, a aba "Perguntar" usa busca por palavras-chave
  (BM25) e mostra os trechos encontrados, sem gerar texto.
- **Contra alucinação:** o prompt manda responder só com os trechos e dizer quando
  o material não cobre a pergunta. As fontes ficam visíveis para conferir.
- **PDF escaneado** (só imagem) não funciona, porque não há texto para extrair.
- Os vetores ficam em memória: recarregar a página exige indexar de novo.
- **Modelos escolhidos em tempo de execução:** o Google aposenta versões do Gemini com
  frequência, então o app consulta a lista de modelos da API e usa o Flash estável mais
  novo e o modelo de embeddings disponível, em vez de fixar um nome no código.
- **Resiliência:** se o modelo responder 503 (sobrecarregado), o app tenta de novo com
  backoff exponencial e, se continuar falhando, passa para o próximo modelo da lista.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`, cole sua chave gratuita do
[Google AI Studio](https://aistudio.google.com/apikey) e envie um PDF.

## Próximos passos

- Guardar o índice no IndexedDB para não reprocessar o PDF
- Vários PDFs ao mesmo tempo
- Repetição espaçada nos flashcards
