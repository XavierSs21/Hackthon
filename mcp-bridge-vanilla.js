/**
 * Bridge HTTP para MCP (STDIO) + endpoints Gemini (SDK @google/genai v1)
 */

import 'dotenv/config';
import { spawn } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenAI } from '@google/genai';

// -----------------------------
// Config
// -----------------------------
const PORT = Number(process.env.PORT || 8787);
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const SERVER_PATH = process.env.SERVER_PATH || './mcp-fin-advisor-server.py';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// SDK Gemini (GA, v1)
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,  // o GEMINI_API_KEY
  apiVersion: 'v1',
});

// Python runner (por defecto: uv run python ...)
const PYTHON = process.env.PYTHON || 'uv';
const PY_ARGS = PYTHON === 'uv'
  ? ['run', 'python', SERVER_PATH]
  : [SERVER_PATH];

// -----------------------------
// Spawn MCP server (STDIO)
// -----------------------------
const child = spawn(PYTHON, PY_ARGS, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env,
});

child.stderr.on('data', d => process.stderr.write(`[mcp-server] ${d}`));
child.on('exit', code => {
  console.error(`MCP server exited with code ${code}`);
  process.exit(code || 1);
});

process.on('SIGINT', () => { try { child.kill('SIGINT'); } catch { } process.exit(0); });
process.on('SIGTERM', () => { try { child.kill('SIGTERM'); } catch { } process.exit(0); });

// -----------------------------
// JSON-RPC over NDJSON/LSP
// -----------------------------
let nextId = 1;
const pending = new Map();
let buffer = '';

child.stdout.on('data', chunk => {
  buffer += chunk.toString('utf8');

  // LSP framing (Content-Length)
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;
    const header = buffer.slice(0, headerEnd);
    const m = /Content-Length:\s*(\d+)/i.exec(header);
    if (!m) break;
    const length = parseInt(m[1], 10);
    const start = headerEnd + 4;
    const end = start + length;
    if (buffer.length < end) break;
    const body = buffer.slice(start, end);
    buffer = buffer.slice(end);
    try {
      const msg = JSON.parse(body);
      handleRpcMessage(msg);
    } catch (e) {
      console.error('Parse MCP (LSP) failed:', e);
    }
  }

  // NDJSON fallback
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    if (/^Content-Length:/i.test(line)) continue;
    try {
      const msg = JSON.parse(line);
      handleRpcMessage(msg);
    } catch {
      buffer = line + '\n' + buffer;
      break;
    }
  }
});

function handleRpcMessage(msg) {
  if (msg?.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if ('error' in msg) reject(new Error(msg.error?.message || 'MCP error'));
    else resolve(msg.result);
  }
}

function sendRpc(method, params = {}) {
  const id = nextId++;
  const payload = { jsonrpc: '2.0', id, method, params };
  child.stdin.write(JSON.stringify(payload) + '\n');
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`RPC timeout for ${method}`));
      }
    }, 30000);
  });
}

function sendNotification(method, params = {}) {
  const payload = { jsonrpc: '2.0', method, params };
  child.stdin.write(JSON.stringify(payload) + '\n');
}

// Init MCP
(async () => {
  try {
    await sendRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'hackthon-bridge-vanilla', version: '0.1.0' },
    });
    sendNotification('notifications/initialized', {});
    console.log('MCP bridge initialized with server');
  } catch (e) {
    console.error('Failed to initialize MCP server:', e);
    process.exit(1);
  }
})();

// -----------------------------
// Express app + endpoints
// -----------------------------
const app = express();
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(bodyParser.json());

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// MCP
app.get('/tools', async (_req, res) => {
  try { res.json(await sendRpc('tools/list', {})); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post('/tools/call', async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body || {};
    res.json(await sendRpc('tools/call', { name, arguments: args }));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get('/prompts', async (_req, res) => {
  try { res.json(await sendRpc('prompts/list', {})); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post('/prompts/run', async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body || {};
    res.json(await sendRpc('prompts/run', { name, arguments: args }));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get('/resources', async (_req, res) => {
  try { res.json(await sendRpc('resources/list', {})); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post('/resources/read', async (req, res) => {
  try {
    const { uri } = req.body || {};
    res.json(await sendRpc('resources/read', { uri }));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post('/rpc', async (req, res) => {
  try {
    const { method, params = {} } = req.body || {};
    res.json(await sendRpc(method, params));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// Gemini: single-shot (GA)
app.post('/gemini/chat', async (req, res) => {
  try {
    const {
      model = DEFAULT_MODEL,
      messages = [],
      input,
      system,                  // <-- NUEVO: texto de contexto
      generationConfig,        // <-- opcional
      safetySettings
    } = req.body || {};

    const contents = [
      ...(system ? [{
        role: 'user',
        parts: [{ text: `Recuerda cumplir SIEMPRE: Español es-MX, MXN es-MX, viñetas, cerrar con: "No es asesoría financiera."` }]
      }] : []),



      ...messages.filter(m => m?.content).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      ...(input ? [{ role: 'user', parts: [{ text: input }] }] : []),
    ];
    const payload = { model, contents };
    if (system) payload.systemInstruction = { text: system };     // <-- CLAVE
    payload.generationConfig = Object.assign({ temperature: 0.2 }, req.body?.generationConfig || {});
    if (generationConfig) payload.generationConfig = generationConfig;
    if (safetySettings) payload.safetySettings = safetySettings;


    const resp = await ai.models.generateContent({ model, contents });
    let out = resp.text || "";
    const CLAUSE = process.env.DISCLAIMER_TEXT || 'Esta información es educativa; no constituye asesoría financiera, fiscal ni legal. Valídala con tu asesor Banorte.';

    const raw = (resp.text || '').trim();
    const same = (a, b) => a.replace(/\s+/g,' ').trim().toLowerCase() === b.replace(/\s+/g,' ').trim().toLowerCase();

    if (!out.trim().endsWith(CLAUSE)) {
      // si no termina exactamente con la cláusula, la agregamos en una línea nueva
      out = `${out.trim()}\n\n${CLAUSE}`;
    }
    res.json({ text: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Gemini: streaming NDJSON (GA)
app.post('/gemini/chat-stream', async (req, res) => {
  try {
    const {
      model = DEFAULT_MODEL,
      messages = [],
      input,
      system,                  // <-- NUEVO
      generationConfig,        // <-- opcional
      safetySettings
    } = req.body || {};
    const contents = [
      ...messages.filter(m => m?.content).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      ...(input ? [{ role: 'user', parts: [{ text: input }] }] : []),
    ];

    const payload = { model, contents };
    if (system) payload.systemInstruction = { text: system };     // <-- CLAVE
    if (generationConfig) payload.generationConfig = generationConfig;
    if (safetySettings) payload.safetySettings = safetySettings;

    const stream = await ai.models.generateContentStream({ model, contents });
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    for await (const chunk of stream) {
      const delta = chunk.text;
      if (delta) res.write(JSON.stringify({ delta }) + '\n');
    }
    res.write(JSON.stringify({ done: true }) + '\n');
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: String(e?.message || e) });
    else { try { res.write(JSON.stringify({ error: String(e?.message || e) }) + '\n'); } catch { } res.end(); }
  }
});

// ÚNICO listen
app.listen(PORT, () => {
  console.log(`Bridge on http://localhost:${PORT}`);
  console.log(`Spawning: ${PYTHON} ${PY_ARGS.join(' ')}`);
});
