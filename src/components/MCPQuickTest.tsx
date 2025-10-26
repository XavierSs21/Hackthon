// src/components/MCPQuickTest.jsx
import { useState } from "react";
import { listTools, callTool, unwrapText } from "../lib/mcp";
import { useEffect } from "react";
import { health } from "../lib/mcp";

useEffect(() => {
  // Solo para depurar:
  console.log("VITE_BRIDGE_URL =", (import.meta?.env && import.meta.env.VITE_BRIDGE_URL));
  health().then(h => console.log("bridge /health:", h)).catch(err => console.error(err));
}, []);

export default function MCPQuickTest() {
  const [out, setOut] = useState("");

  async function onList() {
    try {
      const res = await listTools(); // <- pega a http://localhost:8787/tools
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut("Error listTools: " + e.message);
    }
  }

  async function onFx() {
    try {
      const res = await callTool("fx_convert", { amount: 100, from_currency: "USD", to_currency: "MXN" });
      setOut(unwrapText(res));
    } catch (e) {
      setOut("Error fx_convert: " + e.message);
    }
  }

  return (
    <div className="p-3 space-y-2 rounded-2xl border border-white/10 bg-black/10">
      <div className="flex gap-2">
        <button onClick={onList} className="px-3 py-2 rounded bg-neutral-800 text-white">Listar tools</button>
        <button onClick={onFx} className="px-3 py-2 rounded bg-blue-600 text-white">Probar fx_convert</button>
      </div>
      <pre className="text-sm whitespace-pre-wrap bg-neutral-900/60 rounded p-3">{out || "Salida aquí..."}</pre>
    </div>
  );
}
