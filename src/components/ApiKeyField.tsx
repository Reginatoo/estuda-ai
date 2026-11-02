import { useState } from "react";

interface Props {
  value: string | null;
  onChange: (key: string | null) => void;
}

/** Campo da chave do Gemini. A chave fica só no navegador de quem usa (localStorage). */
export function ApiKeyField({ value, onChange }: Props) {
  const [editing, setEditing] = useState(!value);
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
    return (
      <div className="key">
        <span className={value ? "pill ok" : "pill"}>{value ? "Gemini conectado" : "Modo demonstração"}</span>
        <button className="link" onClick={() => setEditing(true)}>
          {value ? "trocar chave" : "usar chave"}
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
      <button onClick={save}>{draft.trim() ? "Salvar" : "Sem chave"}</button>
    </div>
  );
}
