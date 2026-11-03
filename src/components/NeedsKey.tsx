export function NeedsKey({ what }: { what: string }) {
  return (
    <p className="hint">
      Para {what}, cole uma chave do Gemini em “usar minha chave”. Ela é gratuita no{" "}
      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
        Google AI Studio
      </a>
      . A aba “Perguntar” funciona sem chave, no modo demonstração.
    </p>
  );
}
