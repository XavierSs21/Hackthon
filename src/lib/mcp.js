// src/lib/mcp.js
const BASE = (import.meta?.env && import.meta.env.VITE_BRIDGE_URL) || "http://localhost:8787";

async function api(path, init) {
  const r = await fetch(`${BASE}${path}`, init);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}


export async function health() {
  return api("/health");
}

export async function listTools() {
  return api("/tools");
}

export async function callTool(name, args = {}) {
  return api("/tools/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
}
export async function listPrompts() {
  return api("/prompts");
}

export async function runPrompt(name, args = {}) {
  return api("/prompts/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
}

export async function listResources() {
  return api("/resources");
}

export async function readResource(uri) {
  return api("/resources/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uri }),
  });
}

/** Extrae texto amigable de una respuesta MCP. */
export function unwrapText(res) {
  const c = res?.content;
  if (Array.isArray(c) && c[0]?.text) return c[0].text;
  if (typeof res === "string") return res;
  return JSON.stringify(res, null, 2);
}
