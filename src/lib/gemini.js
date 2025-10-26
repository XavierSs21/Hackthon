const BASE = import.meta.env.VITE_BRIDGE_URL;

export async function geminiChat({ messages, input, model = "gemini-2.0-flash" }) {
  const r = await fetch(`${BASE}/gemini/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, input }),
  });
  if (!r.ok) throw new Error(`Gemini chat failed: ${r.status}`);
  return r.json(); // { text }
}
