"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

import KPICard from "./components/KPICard";
import CashFlowChart from "./components/CashFlowChart";
import BudgetVarianceChart from "./components/BudgetVarianceChart";
import ExpenseBreakdownChart from "./components/ExpenseBreakdownChart";
import ChatInterface from "./components/ChatInterface";
import MCPQuickTest from "./components/MCPQuickTest"; // opcional si existe
import { geminiChat } from "./lib/gemini";

import {
  initialKPIs,
  initialCashFlowData,
  initialBudgetData,
  initialExpenseData,
} from "./data/mockData";

import { health, listTools, callTool, unwrapText } from "./lib/mcp";

/** Parser de slash-commands */
function trySlashCommand(input) {
  const p = input.trim().split(/\s+/);

  // /fx 100 USD MXN
  if (p[0] === "/fx" && p.length === 4) {
    return {
      tool: "fx_convert",
      args: { amount: parseFloat(p[1]), from_currency: p[2], to_currency: p[3] },
    };
  }

  // /budget 30000 12000 5000
  if (p[0] === "/budget" && p.length === 4) {
    return {
      tool: "budget_plan",
      args: {
        monthly_income: +p[1],
        fixed_costs: +p[2],
        variable_costs: +p[3],
        savings_goal_pct: 20,
        currency: "MXN",
      },
    };
  }

  // /retire edadActual edadRetiro ahorroActual aporteMensual [rend%] [infl%] [MXN|USD...]
  if (p[0] === "/retire" && p.length >= 5) {
    return {
      tool: "retirement_projection",
      args: {
        current_age: +p[1],
        retirement_age: +p[2],
        current_savings: +p[3],
        monthly_contribution: +p[4],
        expected_return_pct: p[5] ? +p[5] : 6,
        inflation_pct: p[6] ? +p[6] : 3,
        currency: p[7] || "MXN",
      },
    };
  }

  // /risk 5 4 3 4 5 3 2 4 (8–12 números de 1–5)
  if (p[0] === "/risk" && p.length >= 3) {
    const answers = p.slice(1).map((x) => Number(x));
    return {
      tool: "risk_profile",
      args: { answers_json: JSON.stringify(answers) },
    };
  }

  return null;
}

/** Panel mini para probar /tools y fx_convert */
function MCPMini() {
  const [out, setOut] = useState("");
  const BASE = (import.meta?.env && import.meta.env.VITE_BRIDGE_URL) || "http://localhost:8787";

  async function handleList() {
    try {
      const res = await fetch(`${BASE}/tools`);
      const j = await res.json();
      setOut(JSON.stringify(j, null, 2));
    } catch (e) {
      setOut("Error listTools: " + (e?.message ?? String(e)));
    }
  }

  async function handleFx() {
    try {
      const r = await fetch(`${BASE}/tools/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "fx_convert", arguments: { amount: 100, from_currency: "USD", to_currency: "MXN" } }),
      });
      const j = await r.json();
      const c = j?.content;
      const txt = Array.isArray(c) && c[0]?.text ? c[0].text : JSON.stringify(j, null, 2);
      setOut(txt);
    } catch (e) {
      setOut("Error fx_convert: " + (e?.message ?? String(e)));
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">MCP Mini</h3>
        <span className="text-xs opacity-70">{BASE}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={handleList} className="px-3 py-2 rounded bg-neutral-800 text-white">Listar tools</button>
        <button onClick={handleFx} className="px-3 py-2 rounded bg-blue-600 text-white">Probar fx_convert</button>
      </div>
      <pre className="text-xs whitespace-pre-wrap bg-neutral-900/60 rounded p-3">{out || "Salida aquí..."}</pre>
    </div>
  );
}

export default function App() {
  // Estado principal
  const [kpis, setKpis] = useState(initialKPIs);
  const [cashFlowData, setCashFlowData] = useState(initialCashFlowData);
  const [budgetData, setBudgetData] = useState(initialBudgetData);
  const [expenseData, setExpenseData] = useState(initialExpenseData);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Ping real al bridge y log de salud
  useEffect(() => {
    console.log("VITE_BRIDGE_URL =", (import.meta?.env && import.meta.env.VITE_BRIDGE_URL));
    health().then(h => console.log("bridge /health:", h)).catch(err => console.error(err));

    let alive = true;
    async function poll() {
      try {
        const base = (import.meta?.env && import.meta.env.VITE_BRIDGE_URL) || "http://localhost:8787";
        const r = await fetch(`${base}/health`, { cache: "no-store" });
        if (!alive) return;
        setIsConnected(r.ok);
      } catch {
        if (!alive) return;
        setIsConnected(false);
      } finally {
        if (alive) setTimeout(poll, 2000);
      }
    }
    poll();
    return () => { alive = false; };
  }, []);

  // Estados para Acciones MCP (opcional)
  const [toolsOut, setToolsOut] = useState("");
  const [csvOut, setCsvOut] = useState("");

  async function handleListTools() {
    try {
      const res = await listTools();
      setToolsOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setToolsOut("Error listTools: " + (e?.message ?? String(e)));
    }
  }

  async function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const res = await callTool("analyze_cashflow", {
        csv_text: text,
        currency: "MXN",
        has_header: true,
      });
      const txt = unwrapText(res);
      setCsvOut(txt);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: txt,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch (e) {
      setCsvOut("Error analyze_cashflow: " + (e?.message ?? String(e)));
    } finally {
      e.target.value = "";
    }
  }

  const SYSTEM = `
Eres "Copiloto Financiero Banorte". Ayudas a usuarios en México a entender sus finanzas personales y de PyME.
- Usa MXN por defecto y formato es-MX.
- Da contexto, pasos concretos y números redondeados; usa bullets cuando ayude.
- Si hay comandos tipo /fx, /budget, /retire, /risk, prioriza herramientas MCP; si no, responde tú.
- Aclara que no es asesoría financiera/tributaria legal; invita a validar con un asesor.
- Si faltan datos clave (monto, plazo, tasa), pide 1–2 aclaraciones, no interrogatorio.
- Ajusta ejemplos a ingresos/gastos típicos en MX y tasas razonables; advierte supuestos.
`;

  // Enviar mensaje (slash-commands -> MCP; otro -> Gemini)
  const sendMessage = (raw) => {
    const clean = (raw ?? "").trim();
    if (!clean || isTyping) return;

    const userMessage = {
      id: Date.now(),
      text: clean,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMessage]);

    // ¿Es comando?
    const cmd = trySlashCommand(clean);
    if (cmd) {
      setIsTyping(true);
      callTool(cmd.tool, cmd.args)
        .then((res) => {
          const out = unwrapText(res);
          const aiMessage = {
            id: Date.now() + 1,
            text: out,
            sender: "ai",
            timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, aiMessage]);
        })
        .finally(() => setIsTyping(false));
      return;
    }

    // No es comando → Gemini vía bridge
    (async () => {
      setIsTyping(true);
      try {
        // Mapea historial UI -> formato Gemini
        const history = [...messages, userMessage].map(m => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text,
        }));

        const { text: reply } = await geminiChat({
          messages: history,
          system: SYSTEM,
          generationConfig: { temperature: 0.2 },
        });
        const aiMessage = {
          id: Date.now() + 1,
          text: reply,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        const aiMessage = {
          id: Date.now() + 1,
          text: `Error con Gemini: ${err?.message ?? String(err)}`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  // Simulación (demo)
  const simulateScenario = () => {
    setKpis((prev) => ({
      revenue: prev.revenue * 1.05,
      netProfit: prev.netProfit * 1.03,
      cashFlow: prev.cashFlow * 1.08,
      budgetVariance: prev.budgetVariance * 0.95,
    }));
    setCashFlowData((prev) =>
      prev.map((item, index) => (index >= 9 ? { ...item, proyectado: item.proyectado * 1.08 } : item))
    );
    setBudgetData((prev) => prev.map((item) => ({ ...item, real: item.real * 1.03 })));
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 text-white shadow-md">
        <div className="bg-[#EE0027]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/LogoBanorte.png" alt="Banorte" className="h-7 w-auto" />
              <h1 className="text-sm sm:text-base md:text-lg font-semibold tracking-wide uppercase">Copiloto Financiero Banorte</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs">
                <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                {isConnected ? "Conectado" : "Desconectado"}
              </span>
              {isConnected ? <Wifi className="w-5 h-5 text-white/90 sm:hidden" /> : <WifiOff className="w-5 h-5 text-white/90 sm:hidden" />}
            </div>
          </div>
        </div>
        <div className="bg-[#C70021]">
          <nav className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-10 flex items-center gap-6 text-sm">
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">Resumen</button>
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">Cuentas</button>
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">Gastos</button>
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">Presupuesto</button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard title="Ingresos" value={kpis.revenue} change={8.5} trend="up" />
              <KPICard title="Beneficio Neto" value={kpis.netProfit} change={12.3} trend="up" />
              <KPICard title="Flujo de Caja" value={kpis.cashFlow} change={-3.2} trend="down" />
              <KPICard title="Variación Presupuestaria" value={kpis.budgetVariance} change={-2.1} trend="down" />
            </div>
            <CashFlowChart data={cashFlowData} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <BudgetVarianceChart data={budgetData} />
              <ExpenseBreakdownChart data={expenseData} />
            </div>
            <div className="flex justify-center">
              <button onClick={simulateScenario} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 hover:scale-105 transition-all duration-300">
                Simular Escenario Demo
              </button>
            </div>
          </div>

          {/* Col derecha: Chat + MCP */}
          <div className="lg:col-span-1 space-y-6">
            <ChatInterface messages={messages} isTyping={isTyping} isConnected={isConnected} onSendMessage={sendMessage} />

            {/* Panel MCP Mini */}
            <MCPMini />

            {/* Acciones MCP (opcional) */}
            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Acciones MCP</h3>
                <span className="text-xs opacity-70">{import.meta?.env?.VITE_BRIDGE_URL ?? "http://localhost:8787"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleListTools} className="px-3 py-2 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700">Listar tools</button>
                <label className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer">
                  Subir CSV (cashflow)
                  <input type="file" accept=".csv" onChange={handleCSVFile} className="sr-only" />
                </label>
              </div>
              {!!toolsOut && <pre className="text-xs whitespace-pre-wrap bg-neutral-900/60 rounded p-3">{toolsOut}</pre>}
              {!!csvOut && <pre className="text-xs whitespace-pre-wrap bg-neutral-900/60 rounded p-3">{csvOut}</pre>}
            </div>

            {/* (opcional) Tester TSX si existe */}
            {typeof MCPQuickTest !== "undefined" && <MCPQuickTest />}
          </div>
        </div>
      </main>
    </div>
  );
}
