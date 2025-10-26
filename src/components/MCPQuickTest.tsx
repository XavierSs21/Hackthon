import { useState } from "react";
// Usa el import que concuerde con tu proyecto:
// Si tu archivo está en src/lib/mcp.ts usa:
import { listTools, callTool, unwrapText } from "@/lib/mcp";
// O ajusta la ruta según la ubicación real del archivo 'mcp.ts'
// Si no usas alias @, entonces: import { listTools, callTool, unwrapText } from "../lib/mcp";

export default function MCPQuickTest() {
  const [out, setOut] = useState<string>("");
  const [loading, setLoading] = useState<"list" | "fx" | null>(null);

  const onList = async () => {
    setLoading("list");
    try {
      const res = await listTools();            // -> { tools: [...] }
      setOut(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setOut("Error listTools: " + (e?.message ?? String(e)));
    } finally {
      setLoading(null);
    }
  };

  const onFx = async () => {
    setLoading("fx");
    try {
      const res = await callTool("fx_convert", {
        amount: 100,
        from_currency: "USD",
        to_currency: "MXN",
      });
      setOut(unwrapText(res));                  // tolerante al formato
    } catch (e: any) {
      setOut("Error fx_convert: " + (e?.message ?? String(e)));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-3 space-y-2 rounded-2xl border border-white/10 bg-black/10">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">MCP Quick Test</h3>
        <span className="text-xs opacity-70">
          {import.meta?.env?.VITE_BRIDGE_URL ?? "http://localhost:8787"}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onList}
          className="px-3 py-2 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50"
          disabled={!!loading}
        >
          {loading === "list" ? "Cargando…" : "Listar tools"}
        </button>

        <button
          onClick={onFx}
          className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          disabled={!!loading}
        >
          {loading === "fx" ? "Convirtiendo…" : "Probar fx_convert"}
        </button>
      </div>

      <pre className="text-sm whitespace-pre-wrap bg-neutral-900/60 rounded-xl p-3">
        {out || "Salida aquí…"}
      </pre>
    </div>
  );
}
