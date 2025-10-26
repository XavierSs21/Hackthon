/**
 * Zero-dependency HTTP Bridge for MCP over STDIO (NDJSON framing)
 * - Envía JSON-RPC 2.0 por NDJSON (una línea por mensaje)
 * - `notifications/initialized` se manda como notificación (sin id)
 * - Exposición HTTP mínima con CORS
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import { URL } from 'node:url';

// -----------------------------
// Config
// -----------------------------
const PORT = Number(process.env.PORT || 8787);
const PYTHON = process.env.PYTHON || 'python3';
const SERVER_PATH = process.env.SERVER_PATH || './mcp-fin-advisor-server.py';

// -----------------------------
// Spawn MCP server (STDIO)
// -----------------------------
const child = spawn(PYTHON, [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env,
});

child.stderr.on('data', (d) => {
  process.stderr.write(`[mcp-server] ${d}`);
});

child.on('exit', (code) => {
  console.error(`MCP server exited with code ${code}`);
  process.exit(code || 1);
});

process.on('SIGINT', () => { try { child.kill('SIGINT'); } catch {} process.exit(0); });
process.on('SIGTERM', () => { try { child.kill('SIGTERM'); } catch {} process.exit(0); });

// -----------------------------
// JSON-RPC over NDJSON
// -----------------------------
let nextId = 1;
const pending = new Map();
let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');

  // 1) Si vienen headers LSP, parsea por LSP
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

  // 2) También intenta NDJSON (línea por línea)
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    // Ignora posibles headers sueltos
    if (/^Content-Length:/i.test(line)) continue;
    try {
      const msg = JSON.parse(line);
      handleRpcMessage(msg);
    } catch {
      buffer = line + '\n' + buffer; // espera más datos
      break;
    }
  }
});


function handleRpcMessage(msg) {
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if ('error' in msg) reject(new Error(msg.error?.message || 'MCP error'));
    else resolve(msg.result);
  }
}

function sendRpc(method, params = {}) {
  const id = nextId++;
  const payload = { jsonrpc: '2.0', id, method, params };
  const json = JSON.stringify(payload);
  child.stdin.write(json + '\n'); // NDJSON
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
  const payload = { jsonrpc: '2.0', method, params }; // sin id
  const json = JSON.stringify(payload);
  child.stdin.write(json + '\n'); // NDJSON
}


// Init MCP session
(async () => {
  try {
    await sendRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'hackthon-bridge-vanilla', version: '0.1.0' },
    });

    // NOTIFICACIÓN (sin id)
    sendNotification('notifications/initialized', {});

    console.log('MCP bridge initialized with server');
  } catch (e) {
    console.error('Failed to initialize MCP server:', e);
    process.exit(1);
  }
})();

// -----------------------------
// HTTP server with CORS
// -----------------------------
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/tools') {
      const result = await sendRpc('tools/list', {});
      return json(res, result);
    }
    if (req.method === 'POST' && url.pathname === '/tools/call') {
      const body = await readJson(req);
      const result = await sendRpc('tools/call', { name: body?.name, arguments: body?.arguments || {} });
      return json(res, result);
    }
    if (req.method === 'GET' && url.pathname === '/prompts') {
      const result = await sendRpc('prompts/list', {});
      return json(res, result);
    }
    if (req.method === 'POST' && url.pathname === '/prompts/run') {
      const body = await readJson(req);
      const result = await sendRpc('prompts/run', { name: body?.name, arguments: body?.arguments || {} });
      return json(res, result);
    }
    if (req.method === 'GET' && url.pathname === '/resources') {
      const result = await sendRpc('resources/list', {});
      return json(res, result);
    }
    if (req.method === 'POST' && url.pathname === '/resources/read') {
      const body = await readJson(req);
      const result = await sendRpc('resources/read', { uri: body?.uri });
      return json(res, result);
    }
    if (req.method === 'POST' && url.pathname === '/rpc') {
      const body = await readJson(req);
      const result = await sendRpc(body?.method, body?.params || {});
      return json(res, result);
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
});

server.listen(PORT, () => {
  console.log(`Zero-dep MCP Bridge listening on http://localhost:${PORT}`);
  console.log(`Spawning: ${PYTHON} ${SERVER_PATH}`);
});

// -----------------------------
// Helpers
// -----------------------------
function json(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
