# Guía de Instalación - Copiloto Financiero Banorte

## Objetivo

Setup completo.

---

## Prerrequisitos

Antes de empezar, verifica que tienes:

- [ ] **Node.js 18+** instalado → [Descargar](https://nodejs.org/)
- [ ] **Python 3.11+** instalado → [Descargar](https://python.org/)
- [ ] **Git** instalado → [Descargar](https://git-scm.com/)
- [ ] **Editor de código** (VSCode recomendado)
- [ ] **Google Gemini API Key** → [Obtener gratis](https://ai.google.dev/)
- [ ] **Conexión a internet** estable

### Verificar Versiones

```bash
# Node.js (debe ser 18 o superior)
node --version
# Ejemplo: v18.17.0

# Python (debe ser 3.11 o superior)  
python --version
# Ejemplo: Python 3.11.5

# Git
git --version
# Ejemplo: git version 2.40.0

# pnpm (opcional pero recomendado)
pnpm --version
# Si no lo tienes: npm install -g pnpm
```

---

## Instalación Paso a Paso

### Paso 1: Clonar el Repositorio

```bash
# Opción A: HTTPS (más común)
git clone https://github.com/tu-usuario/banorte-copiloto-financiero.git
cd banorte-copiloto-financiero

# Opción B: SSH (si tienes llaves configuradas)
git clone git@github.com:tu-usuario/banorte-copiloto-financiero.git
cd banorte-copiloto-financiero
```

### Paso 2: Instalar Dependencias del Frontend

```bash
# Con pnpm (RECOMENDADO - más rápido)
pnpm install

# O con npm
npm install

# O con yarn
yarn install
```

**¿Qué se instala?**
- React 18 + React DOM
- Vite 5 (build tool)
- Tailwind CSS 3
- shadcn/ui components
- Recharts (gráficos)
- Papaparse (CSV parser)
- Lucide React (iconos)
- @google/genai (SDK Gemini)
- Express + CORS (bridge)
- ~38 dependencias en total

**Tiempo estimado:** 1-2 minutos

### Paso 3: Instalar Dependencias de Python

```bash
# Opción A: Con pip (directa)
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil

# Opción B: Con entorno virtual (más limpio)
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil

# Opción C: Con uv (ultra-rápido)
pip install uv
uv pip install 'mcp[cli]>=1.2.0' httpx python-dateutil
```

**¿Qué se instala?**
- `mcp[cli]` - SDK oficial de Model Context Protocol
- `httpx` - Cliente HTTP async
- `python-dateutil` - Manejo de fechas

### Paso 4: Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# O crear desde cero
touch .env
```

Edita el archivo `.env` con tu editor favorito:

```bash
# Con VSCode
code .env

# Con nano (Linux/Mac)
nano .env

# Con vim
vim .env

# Con notepad (Windows)
notepad .env
```

**Contenido del archivo `.env`:**

```env
#############################################
# REQUERIDO: Google Gemini API Key
#############################################
GOOGLE_API_KEY=AIzaSy...PegaTuKeyAquí

#############################################
# Bridge Server Configuration
#############################################
PORT=8787
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

#############################################
# MCP Server Configuration  
#############################################
PYTHON=python
SERVER_PATH=./mcp-fin-advisor-server.py

#############################################
# AI Model Selection
#############################################
GEMINI_MODEL=gemini-2.0-flash
# Alternativas:
# - gemini-2.0-flash-thinking-exp (experimental)
# - gemini-1.5-pro (más costoso, más capaz)

#############################################
# Disclaimer Text (Opcional)
#############################################
DISCLAIMER_TEXT=Esta información es educativa; no constituye asesoría financiera, fiscal ni legal. Valídala con tu asesor Banorte.

#############################################
# OPCIONAL: Finnhub API (para stocks)
#############################################
# FINNHUB_API_KEY=tu_finnhub_key_aqui
```

#### Obtener Gemini API Key

1. Ve a [Google AI Studio](https://ai.google.dev/)
2. Haz click en **"Get API Key"**
3. Crea un nuevo proyecto o usa uno existente
4. Copia la API key
5. Pégala en tu archivo `.env`

Google da créditos generosos para desarrollo.

### Paso 5: Iniciar los Servicios

Necesitas **3 terminales** abiertas simultáneamente:

#### Terminal 1: Bridge Server (Backend)

```bash
# Asegúrate de estar en la raíz del proyecto
node mcp-bridge-vanilla.js
```

**Salida esperada:**
```
Bridge listening on http://localhost:8787
MCP server spawned successfully (PID: 12345)
[mcp-server] INFO: MCP Server initialized: mcp-fin-advisor  
[mcp-server] INFO: 6 tools registered
Ready to accept requests 
```

Si ves esto, el bridge está funcionando correctamente.

#### Terminal 2: MCP Server (Python)

```bash
# Con Python directo
python mcp-fin-advisor-server.py

# O con entorno virtual activado
source .venv/bin/activate  # primero activa
python mcp-fin-advisor-server.py

# O con uv
uv run python mcp-fin-advisor-server.py
```

**Salida esperada:**
```
INFO:mcp-fin-advisor:MCP Server initialized: mcp-fin-advisor
INFO:mcp-fin-advisor:Registered tool: fx_convert
INFO:mcp-fin-advisor:Registered tool: analyze_cashflow
INFO:mcp-fin-advisor:Registered tool: budget_plan
INFO:mcp-fin-advisor:Registered tool: risk_profile
INFO:mcp-fin-advisor:Registered tool: retirement_projection
INFO:mcp-fin-advisor:Registered tool: quote
INFO:mcp-fin-advisor:Server running on STDIO transport
```

**Nota:** Esta terminal quedará "silenciosa". Es normal.

#### Terminal 3: Frontend (React + Vite)

```bash
# Con pnpm
pnpm dev

# O con npm
npm run dev

# O con yarn
yarn dev
```

**Salida esperada:**
```
  VITE v5.4.21  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Paso 6: Abrir en el Navegador

Abre tu navegador favorito y ve a:

```
http://localhost:5173
```

**Deberías ver:**
- Logo de Banorte en el header rojo
- 4 tarjetas de KPIs
- Gráfico de desglose de gastos
- Chat interface en la columna derecha
- Indicador verde "Conectado" en el header

**Prueba rápida:**
1. Escribe en el chat: `"Hola"`
2. Deberías recibir una respuesta en español de la IA
3. ¡FUNCIONA!

---

## Solución de Problemas Comunes

### Error: "Cannot find module '@google/genai'"

**Causa:** Dependencias no instaladas

**Solución:**
```bash
# Eliminar todo y reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install

# O forzar reinstalación
pnpm install --force
```

### Error: "ModuleNotFoundError: No module named 'mcp'"

**Causa:** MCP SDK no instalado en Python

**Solución:**
```bash
# Reinstalar con flag --break-system-packages si es necesario
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil --break-system-packages

# O con entorno virtual
python -m venv .venv
source .venv/bin/activate
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil
```

### Error: "Port 8787 already in use"

**Causa:** Ya hay algo corriendo en ese puerto

**Solución Opción 1 - Cambiar puerto:**
```bash
# En .env, cambia:
PORT=8788
```

**Solución Opción 2 - Matar proceso:**
```bash
# En Linux/Mac:
lsof -ti:8787 | xargs kill -9

# En Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 8787).OwningProcess | Stop-Process -Force
```

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"

**Causa:** Frontend en puerto diferente al configurado

**Solución:**
```bash
# En .env, verifica que CORS_ORIGIN incluya tu puerto:
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

# Reinicia el bridge:
# Ctrl+C en Terminal 1
node mcp-bridge-vanilla.js
```

### Error: "Invalid API key" al usar Gemini

**Causa:** API key incorrecta o sin permisos

**Solución:**
1. Verifica que copiaste la key completa (sin espacios)
2. Ve a [Google AI Studio](https://ai.google.dev/) 
3. Regenera la API key si es necesario
4. Asegúrate de que Gemini API está habilitada
5. Verifica tu cuota (dashboard de Google Cloud)

### Chat no responde pero todo parece funcionar

**Causa:** Alguno de los 3 servicios no está corriendo

**Diagnóstico:**
```bash
# 1. Verifica el bridge
curl http://localhost:8787/health
# Debe responder: {"status":"ok"}

# 2. Verifica las herramientas MCP
curl http://localhost:8787/tools
# Debe listar 6 herramientas

# 3. Verifica el frontend
curl http://localhost:5173
# Debe devolver HTML

# 4. Revisa la consola del navegador (F12)
# Busca errores en la pestaña "Console"
```

### CSV no se procesa (Error 413 Payload Too Large)

**Causa:** Archivo CSV muy grande

**Solución:**
Este proyecto ya tiene procesamiento local con Papaparse, pero si el archivo es mayor a 5MB:

```bash
# Opción 1: Limita las filas
head -n 1000 tu-archivo.csv > archivo-pequeño.csv

# Opción 2: Divide el archivo
split -l 500 tu-archivo.csv parte_

# Opción 3: Comprime columnas innecesarias
cut -d',' -f1,2,3,4 tu-archivo.csv > archivo-comprimido.csv
```

### "MCP server exited with code 1"

**Causa:** Problema con Python o sus dependencias

**Diagnóstico:**
```bash
# 1. Verifica Python
python --version
# Debe ser 3.11+

# 2. Prueba el servidor MCP manualmente
python mcp-fin-advisor-server.py
# Observa el error específico

# 3. Verifica dependencias
pip list | grep -E "mcp|httpx|dateutil"
# Debe listar las 3
```

**Solución:**
```bash
# Reinstalar todo Python
pip uninstall mcp httpx python-dateutil -y
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil
```

---

## Comandos Útiles

### Desarrollo

```bash
# Reiniciar frontend con cache limpio
pnpm dev --force

# Ver logs detallados del bridge
DEBUG=* node mcp-bridge-vanilla.js

# Ver logs del MCP server
python mcp-fin-advisor-server.py 2>&1 | tee mcp.log

# Limpiar todo y reinstalar
rm -rf node_modules .venv dist
pnpm install
python -m venv .venv && source .venv/bin/activate
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil
```

### Testing

```bash
# Test de health del bridge
curl http://localhost:8787/health

# Test de herramientas MCP disponibles
curl http://localhost:8787/tools | jq

# Test de conversión de divisas
curl -X POST http://localhost:8787/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fx_convert",
    "arguments": {
      "amount": 100,
      "from_currency": "USD",
      "to_currency": "MXN"
    }
  }' | jq

# Test del chat con Gemini
curl -X POST http://localhost:8787/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Hola"}],
    "model": "gemini-2.0-flash"
  }' | jq
```

### Production

```bash
# Build del frontend
pnpm build
# Output: dist/

# Preview del build
pnpm preview

# Si usas PM2 para el backend
pm2 start mcp-bridge-vanilla.js --name bridge
pm2 start "python mcp-fin-advisor-server.py" --name mcp-server
pm2 logs
```

---

## Instalación por Sistema Operativo

### macOS

```bash
# 1. Instalar Homebrew (si no lo tienes)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Instalar prerrequisitos
brew install node python@3.11 git

# 3. Instalar pnpm
npm install -g pnpm

# 4. Continuar con instalación normal (Pasos 1-6)
```

### Linux (Ubuntu/Debian)

```bash
# 1. Actualizar repos
sudo apt update

# 2. Instalar prerrequisitos
sudo apt install -y nodejs npm python3 python3-pip git

# 3. Instalar pnpm
npm install -g pnpm

# 4. Continuar con instalación normal (Pasos 1-6)
```

### Windows

**Opción A: WSL2 (RECOMENDADO)**
```bash
# 1. Abrir PowerShell como Administrador
wsl --install

# 2. Reiniciar PC
# 3. Seguir pasos de Linux dentro de WSL
```

**Opción B: Windows Nativo**
1. Instalar [Node.js](https://nodejs.org/) (incluye npm)
   - Marcar "Automatically install necessary tools"
2. Instalar [Python](https://www.python.org/downloads/)
   - Marcar "Add Python to PATH"
3. Instalar [Git](https://git-scm.com/download/win)
4. Abrir PowerShell
5. Continuar con Pasos 1-6

---

[⬆ Volver al README](./README.md)