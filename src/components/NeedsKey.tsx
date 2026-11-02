export function NeedsKey({ what }: { what: string }) {
  return (
    <p className="hint">
      Para {what}, cole sua chave do Gemini no canto superior. Ela é gratuita no{" "}
      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
        Google AI Studio
      </a>
      . A aba “Perguntar” funciona sem chave, no modo demonstração.
    </p>
  );
}
