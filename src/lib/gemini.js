const BASE = import.meta.env.VITE_BRIDGE_URL || "http://localhost:8787";
const CLAUSE = "No es asesoría financiera.";

/**
 * Llama al bridge /gemini/chat
 * @param {Object[]} messages - [{role:'user'|'assistant', content:'...'}]
 * @param {string} [input]    - mensaje extra opcional
 * @param {string} [model]    - ej. "gemini-2.0-flash"
 * @param {string} [system]   - contexto/rol (systemInstruction)
 * @param {Object} [generationConfig] - { temperature, topP, maxOutputTokens, ... }
 * @param {Object} [safetySettings]   - ver doc de @google/genai si los usas
 */
export async function geminiChat({
  messages,
  input,
  model = "gemini-2.0-flash",
  system,
  generationConfig,
  safetySettings,
}) {
  const body = { model, messages, input };
  if (system) body.system = system;
  if (generationConfig) body.generationConfig = generationConfig;
  if (safetySettings) body.safetySettings = safetySettings;

  const r = await fetch(`${BASE}/gemini/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Gemini chat failed: ${r.status} ${txt}`);
  }

  const data = await r.json(); // { text }
  let text = (data?.text ?? "").trim();

  // Garantiza la cláusula final
  if (text && !text.endsWith(CLAUSE)) {
    text = `${text}\n\n${CLAUSE}`;
  }
  return { text };
}
