# Diagrama de Arquitectura - Copiloto Financiero Banorte

## Vista de Alto Nivel

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React App<br/>Vite + Tailwind]
        Dashboard[Dashboard<br/>KPIs & Charts]
        Chat[Chat Interface<br/>AI Conversation]
        Upload[File Upload<br/>CSV Analysis]
    end

    subgraph "Bridge Layer"
        Bridge[Bridge Server<br/>Node.js + Express<br/>Port 8787]
        CORS[CORS Handler]
        Router[Request Router]
    end

    subgraph "AI & Tools Layer"
        Gemini[Google Gemini 2.0 Flash<br/>Natural Language Processing]
        MCP[MCP Server<br/>Python + FastMCP<br/>Financial Tools]
    end

    subgraph "External APIs"
        FX[ExchangeRate.host<br/>Currency Conversion]
        Stocks[Finnhub<br/>Stock Quotes]
    end

    UI --> Dashboard
    UI --> Chat
    UI --> Upload
    
    Dashboard --> Bridge
    Chat --> Bridge
    Upload --> Bridge
    
    Bridge --> CORS
    Bridge --> Router
    
    Router -->|Conversation| Gemini
    Router -->|Commands & Tools| MCP
    
    MCP --> FX
    MCP --> Stocks
    
    Gemini -.->|Tool Calling| MCP

    style UI fill:#EE0027,stroke:#C70021,color:#fff
    style Bridge fill:#4285F4,stroke:#1967D2,color:#fff
    style Gemini fill:#34A853,stroke:#188038,color:#fff
    style MCP fill:#FBBC04,stroke:#F29900,color:#000
```

## Flujo de Datos Detallado

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant Bridge as Bridge Server
    participant MCP as MCP Server
    participant Gemini as Gemini AI
    participant API as External APIs

    User->>Frontend: Pregunta: "¿Cuál fue mi flujo de caja?"
    Frontend->>Bridge: POST /gemini/chat
    
    alt Es conversación natural
        Bridge->>Gemini: Process query with context
        Gemini-->>Bridge: AI response
    else Es comando (/fx, /budget, etc)
        Bridge->>MCP: JSON-RPC call tool
        MCP->>API: Fetch external data (if needed)
        API-->>MCP: Data response
        MCP-->>Bridge: Tool result
        Bridge->>Gemini: Format with AI (optional)
        Gemini-->>Bridge: Natural response
    end
    
    Bridge-->>Frontend: Formatted response
    Frontend-->>User: Display in chat + update charts
```

## Arquitectura de Componentes

```mermaid
graph LR
    subgraph "src/components"
        KPI[KPICard.jsx<br/>Métricas visuales]
        Cash[CashFlowChart.jsx<br/>Gráfico líneas]
        Budget[BudgetVarianceChart.jsx<br/>Barras comparativas]
        Expense[ExpenseBreakdownChart.jsx<br/>Pie chart]
        ChatUI[ChatInterface.jsx<br/>Conversación UI]
    end

    subgraph "src/lib"
        GeminiLib[gemini.js<br/>API wrapper]
        MCPLib[mcp.js<br/>MCP client]
    end

    subgraph "src/data"
        Mock[mockData.js<br/>Datos demo]
    end

    App[App.jsx<br/>Main Component]
    
    App --> KPI
    App --> Cash
    App --> Budget
    App --> Expense
    App --> ChatUI
    
    ChatUI --> GeminiLib
    ChatUI --> MCPLib
    
    App --> Mock
    
    style App fill:#EE0027,stroke:#C70021,color:#fff
```

## MCP Tools Architecture

```mermaid
graph TD
    MCP[MCP Server<br/>FastMCP]
    
    MCP --> Tool1[fx_convert<br/>Currency Exchange]
    MCP --> Tool2[analyze_cashflow<br/>CSV Analysis]
    MCP --> Tool3[budget_plan<br/>Budget Planning]
    MCP --> Tool4[risk_profile<br/>Risk Assessment]
    MCP --> Tool5[retirement_projection<br/>Retirement Calc]
    MCP --> Tool6[quote<br/>Stock Prices]
    
    Tool1 --> ExRate[ExchangeRate API]
    Tool6 --> Finn[Finnhub API]
    
    style MCP fill:#FBBC04,stroke:#F29900,color:#000
    style Tool1 fill:#34A853,stroke:#188038,color:#fff
    style Tool2 fill:#34A853,stroke:#188038,color:#fff
    style Tool3 fill:#34A853,stroke:#188038,color:#fff
    style Tool4 fill:#34A853,stroke:#188038,color:#fff
    style Tool5 fill:#34A853,stroke:#188038,color:#fff
    style Tool6 fill:#34A853,stroke:#188038,color:#fff
```

## Infraestructura de Deployment

```mermaid
graph TB
    subgraph "Production"
        CDN[Vercel/Netlify<br/>Frontend CDN]
        AppServer[Railway/Render<br/>Bridge Server]
        Worker[Background Worker<br/>MCP Server Process]
    end

    subgraph "Development"
        Local[localhost:5173<br/>Vite Dev Server]
        LocalBridge[localhost:8787<br/>Bridge Local]
        LocalMCP[Python Process<br/>STDIO]
    end

    subgraph "External Services"
        GeminiCloud[Google Cloud<br/>Gemini API]
        APIs[External APIs<br/>FX, Stocks]
    end

    CDN --> AppServer
    AppServer --> Worker
    AppServer --> GeminiCloud
    Worker --> GeminiCloud
    Worker --> APIs

    Local --> LocalBridge
    LocalBridge --> LocalMCP
    LocalBridge --> GeminiCloud
    LocalMCP --> APIs

    style CDN fill:#4285F4,stroke:#1967D2,color:#fff
    style AppServer fill:#FBBC04,stroke:#F29900,color:#000
    style Worker fill:#34A853,stroke:#188038,color:#fff
    style GeminiCloud fill:#EA4335,stroke:#C5221F,color:#fff
```

## Tech Stack Completo

```mermaid
mindmap
  root((Copiloto<br/>Financiero))
    Frontend
      React 18
      Vite 5
      Tailwind CSS
      shadcn/ui
      Recharts
      Lucide Icons
      Papaparse
    Backend
      Node.js 18+
      Express 5
      Python 3.11+
      FastMCP
      httpx
    AI & APIs
      Gemini 2.0 Flash
      MCP Protocol
      ExchangeRate API
      Finnhub Optional
    DevOps
      Git & GitHub
      pnpm
      ESLint
      Prettier
      Environment Vars
```

## Flujo de Slash Commands

```mermaid
stateDiagram-v2
    [*] --> UserInput
    UserInput --> ParseCommand: Detecta "/"
    ParseCommand --> ValidateCommand
    
    ValidateCommand --> fx_convert: /fx
    ValidateCommand --> budget_plan: /budget
    ValidateCommand --> retirement: /retire
    ValidateCommand --> risk: /risk
    
    fx_convert --> CallMCP
    budget_plan --> CallMCP
    retirement --> CallMCP
    risk --> CallMCP
    
    CallMCP --> MCPServer
    MCPServer --> ExternalAPI: If needed
    ExternalAPI --> FormatResponse
    MCPServer --> FormatResponse: Direct
    
    FormatResponse --> DisplayInChat
    DisplayInChat --> [*]
```

## Seguridad y Validación

```mermaid
graph TD
    Request[HTTP Request] --> CORS{CORS Check}
    CORS -->|Failed| Reject[403 Forbidden]
    CORS -->|Passed| RateLimit{Rate Limit}
    RateLimit -->|Exceeded| Reject429[429 Too Many Requests]
    RateLimit -->|OK| Validate{Input Validation}
    Validate -->|Invalid| Reject400[400 Bad Request]
    Validate -->|Valid| Auth{API Key Check}
    Auth -->|Missing/Invalid| Reject401[401 Unauthorized]
    Auth -->|Valid| Process[Process Request]
    Process --> Response[Send Response]
    
    style Reject fill:#EA4335,stroke:#C5221F,color:#fff
    style Reject429 fill:#EA4335,stroke:#C5221F,color:#fff
    style Reject400 fill:#EA4335,stroke:#C5221F,color:#fff
    style Reject401 fill:#EA4335,stroke:#C5221F,color:#fff
    style Process fill:#34A853,stroke:#188038,color:#fff
```

---

## Notas Técnicas

### Comunicación Frontend ↔ Bridge
- **Protocolo:** HTTP/REST
- **Puerto:** 8787 (configurable)
- **CORS:** Habilitado para desarrollo local
- **Rate Limiting:** Configurable (futuro)

### Comunicación Bridge ↔ MCP Server
- **Protocolo:** JSON-RPC sobre STDIO
- **Transporte:** LSP-style (Content-Length headers)
- **Fallback:** NDJSON line-delimited
- **Timeout:** 15 segundos por llamada

### Comunicación Bridge ↔ Gemini
- **SDK:** @google/genai v1.27.0
- **Modelo:** gemini-2.0-flash
- **API Version:** v1
- **Streaming:** No (por ahora)

### Estado y Persistencia
- **Frontend:** React useState (local)
- **Backend:** Stateless (cada request independiente)
- **Cache:** No implementado (futuro: Redis)
- **DB:** No hay (datos demo en memoria)

---

## Referencias

- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [React 18 Docs](https://react.dev/)

---

**Para visualizar estos diagramas:**
1. Copia el contenido de los bloques ```mermaid```
2. Pégalo en [Mermaid Live Editor](https://mermaid.live/)