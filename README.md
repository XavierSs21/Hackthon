# 💰 Copiloto Financiero Banorte

<div align="center">

![Banorte Logo](./public/LogoBanorte.png)

**Asistente Inteligente con IA para Análisis Financiero Personal y Empresarial**

[![Gemini 2.0 Flash](https://img.shields.io/badge/Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-FF6B6B)](https://modelcontextprotocol.io/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**Banorte Hackathon 2025** 🏆

</div>

---

## ¿Qué es Copiloto Financiero?

Un **dashboard financiero inteligente** que combina visualización de datos en tiempo real con análisis conversacional mediante IA. Permite a PyMEs y particulares en México tomar decisiones financieras informadas en segundos, no en horas.

### Problemática

Las pequeñas y medianas empresas en México dedican **3+ horas semanales** a:
- Generar reportes financieros manualmente
- Analizar hojas de cálculo complejas
- Proyectar escenarios "¿qué pasaría si...?"
- Interpretar datos sin contexto

### Nuestra Solución

Un copiloto financiero que:
- **Habla tu idioma**: Pregunta en español natural, recibe respuestas contextualizadas
- **Visualiza instantáneamente**: KPIs, flujos de caja y análisis en tiempo real
- **Procesa tus datos**: Sube CSVs de transacciones bancarias, obtén insights automáticos
- **Calcula por ti**: 6 herramientas financieras especializadas integradas
- **Aprende de ti**: El sistema mejora sus respuestas con el contexto de tus datos

---

## Características Principales

### 1. Chat Conversacional con IA

Pregunta en lenguaje natural sobre tus finanzas:

```
Usuario: "¿Cuánto gasté en total este mes?"
IA: "Este mes gastaste $45,230 MXN. Tu categoría principal 
       fue Nómina con $20,000 (44%), seguida de Servicios 
       con $8,500 (19%)..."
```

**Powered by Google Gemini 2.0 Flash** con contexto completo de tus finanzas.

### 2. Dashboard Visual Interactivo

- **4 KPIs Principales**: 
  - Tasa de ahorro (% de ingresos guardados)
  - Relación gasto/ingreso
  - Tendencia a 3 meses
  - Concentración de gastos por categoría

- **Gráficos Dinámicos**:
  - Desglose de gastos por categoría (pie chart)
  - Análisis con badges inteligentes (Sano/Atención/Crítico)

### 3. Análisis Inteligente de CSV

**Sube tus estados de cuenta** y obtén automáticamente:

- Flujo de caja mensual (ingresos vs gastos)  
- Balance neto por período  
- Top gastos por categoría  
- Tendencias y patrones  
- Recomendaciones personalizadas  

**Formato CSV esperado:**
```csv
fecha,tipo,categoria,monto,descripcion
2024-10-01,ingreso,Ventas,25000,Pago cliente A
2024-10-02,gasto,Nómina,12000,Sueldos octubre
2024-10-05,gasto,Servicios,3500,Luz y agua
```

**El sistema detecta automáticamente:**
- Columnas en español: `fecha, tipo, categoria, monto`
- Tipos: `ingreso`/`gasto` o `income`/`expense`
- Normaliza números con símbolos ($, comas)

---

## Stack Tecnológico

### Frontend
```
React 18              UI library moderna
Vite 5                Build tool ultra-rápido  
Tailwind CSS 3        Utility-first styling
shadcn/ui             Componentes accesibles
Recharts              Gráficos interactivos
Lucide React          800+ iconos modernos
Papaparse             Parser CSV robusto
```

### Backend
```
Node.js 18+           Runtime del bridge
Express 5             Framework HTTP minimalista
Python 3.11+          Runtime del MCP server
FastMCP               SDK oficial de MCP
httpx                 Cliente HTTP async
python-dateutil       Manipulación de fechas
```

### AI & APIs
```
Google Gemini 2.0 Flash     Modelo de lenguaje (176B params)
Model Context Protocol      Comunicación tools ↔ AI
Exchangerate.host           FX rates sin API key
Finnhub (opcional)          Cotizaciones bursátiles
```

---

## Instalación

### Prerrequisitos

- **Node.js 18+** ([descargar](https://nodejs.org/))
- **Python 3.11+** ([descargar](https://python.org/))
- **pnpm** (recomendado) o npm
- **Google Gemini API Key** ([obtener gratis](https://ai.google.dev/))

### Instalación Rápida (5 minutos)

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/banorte-copiloto-financiero.git
cd banorte-copiloto-financiero

# 2. Instalar dependencias frontend
pnpm install
# o: npm install

# 3. Instalar dependencias Python
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil

# 4. Configurar variables de entorno
cp .env.example .env
# Edita .env y agrega tu GOOGLE_API_KEY

# 5. Iniciar servicios (necesitas 3 terminales)

# Terminal 1: Bridge Server
node mcp-bridge-vanilla.js

# Terminal 2: MCP Server  
python mcp-fin-advisor-server.py

# Terminal 3: Frontend
pnpm dev

# 6. Abrir navegador
# http://localhost:5173
```

### Variables de Entorno (.env)

```env
# REQUERIDO: Google Gemini API
GOOGLE_API_KEY=AIzaSy...TuKeyAqui

# Bridge Server Config
PORT=8787
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

# MCP Server Config  
PYTHON=python
SERVER_PATH=./mcp-fin-advisor-server.py

# Modelo de IA
GEMINI_MODEL=gemini-2.0-flash

# Disclaimer personalizado
DISCLAIMER_TEXT=Esta información es educativa; no constituye asesoría financiera.

# Opcional: API de stocks
# FINNHUB_API_KEY=tu_key_aqui
```

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────┐
│         FRONTEND (React + Vite)                 │
│  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Dashboard   │  │   Chat + CSV Upload     │ │
│  │   KPIs       │  │   (ChatInterface.jsx)   │ │
│  │   Charts     │  │                         │ │
│  └──────────────┘  └─────────────────────────┘ │
└─────────────┬──────────────┬────────────────────┘
              │ HTTP/REST    │
              ▼              │
┌──────────────────────────────────────────────────┐
│       BRIDGE SERVER (Node.js + Express)          │
│  • JSON-RPC ↔ MCP Server (STDIO)                │
│  • REST API ↔ Gemini AI                         │
│  • CORS, error handling, logging                │
└──────┬────────────────────────┬──────────────────┘
       │                        │
       │ JSON-RPC              │ REST API
       ▼                        ▼
┌─────────────────────┐  ┌──────────────────────┐
│  MCP SERVER (Python)│  │  GEMINI AI (Cloud)   │
│  ┌────────────────┐ │  │  • NLP processing    │
│  │ 6 Tools:       │ │  │  • Context aware     │
│  │ • fx_convert   │ │  │  • Tool calling      │
│  │ • analyze_cash │ │  │  • Streaming ready   │
│  │ • budget_plan  │ │  └──────────────────────┘
│  │ • risk_profile │ │
│  │ • retirement   │ │
│  │ • quote        │ │
│  └────────────────┘ │
└─────────────────────┘
```

### Flujo de Datos

1. **Usuario** sube CSV o hace pregunta en chat
2. **Frontend** procesa CSV localmente (Papaparse) → genera resumen
3. **Bridge** recibe request con contexto financiero
4. **Gemini AI** analiza query + contexto → genera respuesta en español
5. **Frontend** muestra respuesta + actualiza gráficos

**Para comandos slash:**
1. Frontend detecta `/comando`
2. Bridge → MCP Server (JSON-RPC)
3. MCP ejecuta tool → respuesta
4. Gemini formatea respuesta (opcional)
5. Frontend muestra resultado

---

## Estructura del Proyecto

```
banorte-copiloto-financiero/
├── src/
│   ├── App.jsx                    # Componente principal (465 líneas)
│   ├── main.jsx                   # Entry point de React
│   ├── index.css                  # Estilos globales + Tailwind
│   ├── components/
│   │   ├── ChatInterface.jsx      # Chat con IA (147 líneas)
│   │   ├── KPICard.jsx            # Tarjetas de métricas (38 líneas)
│   │   ├── ExpenseBreakdownChart.jsx  # Pie chart (63 líneas)
│   │   ├── CashFlowChart.jsx      # Gráfico lineal (67 líneas)
│   │   └── BudgetVarianceChart.jsx    # Barras (77 líneas)
│   ├── lib/
│   │   ├── gemini.js              # Wrapper de Gemini API (44 líneas)
│   │   ├── mcp.js                 # Cliente MCP (56 líneas)
│   │   └── csvToSummary.js        # Parser inteligente CSV (143 líneas)
│   └── data/
│       └── mockData.js            # Datos demo para UI
├── public/
│   ├── LogoBanorte.png            # Logo oficial Banorte
│   └── ...
├── mcp-bridge-vanilla.js          # Bridge Node.js ↔ MCP (291 líneas)
├── mcp-fin-advisor-server.py      # Servidor MCP Python (476 líneas)
├── package.json                   # Deps frontend
├── vite.config.js                 # Config Vite
├── tailwind.config.js             # Config Tailwind (colores Banorte)
└── .env                           # Variables de entorno
```

---

## Diseño y UX

### Paleta de Colores (Banorte Brand)

```css
--banorte-red: #EE0027        /* Rojo principal */
--banorte-dark-red: #C70021   /* Rojo hover/oscuro */
--gray-50: #F9FAFB            /* Fondo claro */
--gray-900: #111827           /* Texto oscuro */
```

### Componentes UI

- **shadcn/ui**: Biblioteca de componentes accesibles (Radix UI + Tailwind)
- **Lucide Icons**: Iconografía moderna y consistente
- **Recharts**: Gráficos responsivos y animados
- **Tailwind CSS**: Utility classes para rapidez de desarrollo

---

## Testing y Desarrollo

### Comandos Útiles

```bash
# Desarrollo
pnpm dev                    # Inicia dev server (puerto 5173)
pnpm build                  # Build para producción
pnpm preview                # Preview del build

# Testing del backend
curl http://localhost:8787/health      # Verifica bridge
curl http://localhost:8787/tools       # Lista herramientas MCP

# Logs
DEBUG=* node mcp-bridge-vanilla.js     # Logs detallados
python mcp-fin-advisor-server.py 2>&1 | tee mcp.log  # Logs Python
```

---

## Deployment

### Backend (Railway/Render)

**Procfile:**
```
web: node mcp-bridge-vanilla.js
```

**Variables de entorno:**
```env
GOOGLE_API_KEY=tu_key_aqui
PYTHON=python
PORT=8787
CORS_ORIGIN=https://tu-frontend.vercel.app
```

**Consideraciones:**
- Instalar Python en el contenedor
- Verificar que `python` apunte a Python 3.11+
- Usar `pip install` en el build script

---

## Troubleshooting

### Error: "Cannot find module '@google/genai'"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error: "MCP server exited with code 1"
```bash
# Verifica que Python tenga las deps:
pip install 'mcp[cli]>=1.2.0' httpx python-dateutil

# Verifica la versión:
python --version  # Debe ser 3.11+
```

### CSV no se procesa correctamente
- Verifica formato: `fecha,tipo,categoria,monto,descripcion`
- Tipos válidos: `ingreso`/`gasto` o `income`/`expense`
- Archivo debe ser < 5MB

### Chat no responde
```bash
# 1. Verifica que los 3 servicios estén corriendo
# 2. Revisa la consola del navegador (F12)
# 3. Verifica GOOGLE_API_KEY en .env
# 4. Prueba el bridge:
curl http://localhost:8787/health
```

---

## Licencia

MIT License - Código abierto para la comunidad.

---

## Equipo

**Desarrollado durante el Banorte Hackathon 2025**

- **Jose Angel Maldonado Rodriguez** 
- **Xavier Sotomayor Saldivar** 
- **Emiliano Campero** 
- **Jose Ulloa Tovar** 

---

## Agradecimientos

- **Google Cloud** por Gemini 2.0 Flash y créditos gratuitos
- **Anthropic** por crear el Model Context Protocol
- **Banorte** por la oportunidad y el reto inspirador
- **Tecnológico de Monterrey** por ser la sede del hackathon y fomentar la innovación
- **shadcn** por los componentes UI de calidad
- Comunidad open source

---

<div align="center">

**Hecho en México 🇲🇽 - HackathonMTY 2025**

[⬆ Volver arriba](#-copiloto-financiero-banorte)

</div>