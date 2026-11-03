import { useState } from "react";

interface Props {
  value: string | null;
  serverOn: boolean;
  onChange: (key: string | null) => void;
}

/**
 * Mostra qual IA está em uso e deixa o usuário colar a própria chave do Gemini
 * (opcional quando o site tem a IA própria). A chave fica só no navegador (localStorage).
 */
export function ApiKeyField({ value, serverOn, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function save() {
    const key = draft.trim() || null;
    try {
      if (key) localStorage.setItem("gemini_key", key);
      else localStorage.removeItem("gemini_key");
    } catch {
      /* navegador sem storage: a chave vale só nesta sessão */
    }
    onChange(key);
    setEditing(false);
    setDraft("");
  }

  if (!editing) {
    const label = value ? "Usando sua chave do Gemini" : serverOn ? "IA do site ativa" : "Modo demonstração";
    return (
      <div className="key">
        <span className={value || serverOn ? "pill ok" : "pill"}>{label}</span>
        <button className="link" onClick={() => setEditing(true)}>
          {value ? "trocar chave" : "usar minha chave"}
        </button>
      </div>
    );
  }

  return (
    <div className="key">
      <input
        type="password"
        placeholder="Cole sua chave do Gemini (AI Studio)"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        aria-label="Chave da API do Gemini"
      />
      <button onClick={save}>{draft.trim() ? "Salvar" : value ? "Remover chave" : "Cancelar"}</button>
    </div>
  );
}
