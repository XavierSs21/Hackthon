"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

import KPICard from "./components/KPICard";
import ExpenseBreakdownChart from "./components/ExpenseBreakdownChart"; // ← único chart
import ChatInterface from "./components/ChatInterface";
import { geminiChat } from "./lib/gemini";

import {
  initialKPIs,
  initialCashFlowData,
  initialBudgetData,
  initialExpenseData,
} from "./data/mockData";

import { health } from "./lib/mcp";
import { parseCSVFile } from "./lib/csvToSummary";

/** (Opcional) Parser de slash-commands para MCP; lo dejamos por si lo reactivas */
function trySlashCommand(input) {
  const p = input.trim().split(/\s+/);
  if (p[0] === "/fx" && p.length === 4) {
    return { tool: "fx_convert", args: { amount: parseFloat(p[1]), from_currency: p[2], to_currency: p[3] } };
  }
  if (p[0] === "/budget" && p.length === 4) {
    return { tool: "budget_plan", args: { monthly_income: +p[1], fixed_costs: +p[2], variable_costs: +p[3], savings_goal_pct: 20, currency: "MXN" } };
  }
  if (p[0] === "/retire" && p.length >= 5) {
    return { tool: "retirement_projection", args: { current_age: +p[1], retirement_age: +p[2], current_savings: +p[3], monthly_contribution: +p[4], expected_return_pct: p[5] ? +p[5] : 6, inflation_pct: p[6] ? +p[6] : 3, currency: p[7] || "MXN" } };
  }
  if (p[0] === "/risk" && p.length >= 3) {
    const answers = p.slice(1).map(Number);
    return { tool: "risk_profile", args: { answers_json: JSON.stringify(answers) } };
  }
  return null;
}

function computeFinanceInsights(summary) {
  if (!summary) return null;

  const months = summary.cashFlowByMonth || [];
  const last = months[months.length - 1] || { income: 0, expense: 0, net: 0 };

  const income = last.income || 0;
  const expense = last.expense || 0;
  const net = last.net || 0;

  const savingsRate = income > 0 ? (net / income) * 100 : 0;   // %
  const spendToIncome = income > 0 ? (expense / income) * 100 : 0; // %

  // Tendencia 3m: promedio últimos 3 net vs 3 previos
  const last3 = months.slice(-3).map(m => m.net || 0);
  const prev3 = months.slice(-6, -3).map(m => m.net || 0);
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const last3Avg = avg(last3);
  const prev3Avg = avg(prev3);
  const trend3m = prev3Avg === 0 ? (last3Avg === 0 ? 0 : 100) : ((last3Avg - prev3Avg) / Math.abs(prev3Avg)) * 100;

  // Top categoría (global, no por mes)
  const categories = summary.expenseBreakdown || [];
  const totalExpense = categories.reduce((a, c) => a + (c.amount || 0), 0) || 1;
  const top = categories[0] || { category: "N/A", amount: 0 };
  const topShare = (top.amount / totalExpense) * 100;

  // Badges
  const savingsBadge =
    savingsRate >= 20 ? { label: "Sano", tone: "good" } :
    savingsRate >= 10 ? { label: "Atención", tone: "warn" } :
                        { label: "Crítico", tone: "bad" };

  const ratioBadge =
    spendToIncome <= 80 ? { label: "Sano", tone: "good" } :
    spendToIncome <= 95 ? { label: "Atención", tone: "warn" } :
                          { label: "Crítico", tone: "bad" };

  const trendBadge =
    trend3m > 5 ? { label: "Mejora", tone: "good" } :
    trend3m < -5 ? { label: "Empeora", tone: "bad" } :
                   { label: "Estable", tone: "warn" };

  const topBadge =
    topShare <= 30 ? { label: "Diversificado", tone: "good" } :
    topShare <= 50 ? { label: "Concentrado", tone: "warn" } :
                     { label: "Riesgo alto", tone: "bad" };

  return {
    savingsRate, spendToIncome, trend3m, topShare, topCategory: top.category,
    badges: { savingsBadge, ratioBadge, trendBadge, topBadge }
  };
}

// Construye bloque compacto de contexto para IA desde el summary
function buildAIContext(summary) {
  if (!summary) return "";

  const { kpis, cashFlowByMonth, expenseBreakdown, budgetVariance } = summary;

  const span =
    cashFlowByMonth?.length
      ? `${cashFlowByMonth[0].month} → ${cashFlowByMonth[cashFlowByMonth.length - 1].month}`
      : "sin rango mensual";

  const topCats = (expenseBreakdown || [])
    .slice(0, 5)
    .map((x) => `${x.category}: $${x.amount.toLocaleString("es-MX")}`)
    .join("; ");

  const vari = (budgetVariance || []).length
    ? `; categorías con presupuesto=${budgetVariance.length}`
    : "";

  return [
    `Datos cargados del CSV (agregados):`,
    `• Ingresos totales: $${kpis.incomeTotal.toLocaleString("es-MX")}`,
    `• Gastos totales: $${kpis.expenseTotal.toLocaleString("es-MX")}`,
    `• Neto total: $${kpis.netTotal.toLocaleString("es-MX")}`,
    `• Transacciones: ${kpis.txCount}`,
    `• Rango de meses: ${span}`,
    topCats ? `• Top gastos por categoría: ${topCats}` : ``,
    vari,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function App() {
  // Estado principal (mock por defecto; se reemplaza al subir CSV)
  const [kpis, setKpis] = useState(initialKPIs);
  const [cashFlowData, setCashFlowData] = useState(initialCashFlowData);
  const [budgetData, setBudgetData] = useState(initialBudgetData);
  const [expenseData, setExpenseData] = useState(initialExpenseData);

  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // 👉 insights y mes seleccionado (deben ir DENTRO del componente)
  const [insights, setInsights] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Guarda el último summary del CSV para dar contexto a la IA
  const [csvSummary, setCsvSummary] = useState(null);
  // Resumen legible que mostramos a la derecha
  const [csvOut, setCsvOut] = useState("");

  // Salud del bridge
  useEffect(() => {
    console.log("VITE_BRIDGE_URL =", import.meta?.env?.VITE_BRIDGE_URL);
    health()
      .then((h) => console.log("bridge /health:", h))
      .catch((err) => console.error(err));

    let alive = true;
    (async function poll() {
      try {
        const base = import.meta?.env?.VITE_BRIDGE_URL || "http://localhost:8787";
        const r = await fetch(`${base}/health`, { cache: "no-store" });
        if (!alive) return;
        setIsConnected(r.ok);
      } catch {
        if (!alive) return;
        setIsConnected(false);
      } finally {
        if (alive) setTimeout(poll, 2000);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Cargar y analizar CSV local (adaptado al esquema en español)
  async function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const summary = await parseCSVFile(file); // si quieres filtrar: parseCSVFile(file, { userId })
      setCsvSummary(summary);

      // KPIs → tarjetas clásicas (las seguimos usando para IA/otros módulos)
      const lastNet =
        summary.cashFlowByMonth.length > 0
          ? summary.cashFlowByMonth[summary.cashFlowByMonth.length - 1].net
          : summary.kpis.netTotal;

      const totalVariance = (summary.budgetVariance || []).reduce(
        (acc, v) => acc + (v.variance || 0),
        0
      );

      setKpis({
        revenue: summary.kpis.incomeTotal, // ingresos totales
        netProfit: summary.kpis.netTotal,  // neto total
        cashFlow: lastNet,                 // neto del último mes (o total)
        budgetVariance: totalVariance,     // tu CSV no trae budget → 0
      });

      // Tomar SOLO el último mes para el pie de categorías
      const lastMonthKey = summary.cashFlowByMonth.length
        ? summary.cashFlowByMonth[summary.cashFlowByMonth.length - 1].month
        : null;

      const lastMonthBreakdown = lastMonthKey
        ? (summary.expenseBreakdownByMonth?.[lastMonthKey] || [])
        : [];

      setExpenseData(lastMonthBreakdown);
      setSelectedMonth(lastMonthKey);

      // (Guardamos por si luego quieres otros gráficos)
      setCashFlowData(summary.cashFlowByMonth);
      setBudgetData(summary.budgetVariance || []);

      // Insights financieros para los KPIs accionables
      setInsights(computeFinanceInsights(summary));

      // Texto legible
      const msg =
        `Resumen CSV:\n` +
        `• Ingresos: $${summary.kpis.incomeTotal.toLocaleString("es-MX")}\n` +
        `• Gastos: $${summary.kpis.expenseTotal.toLocaleString("es-MX")}\n` +
        `• Neto: $${summary.kpis.netTotal.toLocaleString("es-MX")}\n` +
        `• Transacciones: ${summary.kpis.txCount}\n` +
        (summary.cashFlowByMonth.length
          ? `• Meses: ${summary.cashFlowByMonth[0].month} … ${summary.cashFlowByMonth[summary.cashFlowByMonth.length - 1].month}\n`
          : ``) +
        (summary.budgetVariance?.length
          ? `• Con presupuesto (${summary.budgetVariance.length} categorías)\n`
          : `• Sin datos de presupuesto`);

      setCsvOut(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: msg,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setCsvOut(
        "Error al leer CSV. Asegura columnas: id_usuario, fecha, categoria, descripcion, monto, tipo."
      );
    } finally {
      e.target.value = ""; // permite recargar el mismo archivo
    }
  }

  const SYSTEM = `
Eres "Copiloto Financiero Banorte". Ayudas a usuarios en México a entender sus finanzas personales y de PyME.
- Usa MXN por defecto y formato es-MX.
- Da contexto, pasos concretos y números redondeados; usa bullets cuando ayude.
- Si faltan datos clave (monto, plazo, tasa), pide 1–2 aclaraciones, no interrogatorio.
- Ajusta ejemplos a ingresos/gastos típicos en MX y tasas razonables; advierte supuestos.
`;

  // Enviar mensaje → Gemini con contexto del CSV si existe
  const sendMessage = (raw) => {
    const clean = (raw ?? "").trim();
    if (!clean || isTyping) return;

    const userMessage = {
      id: Date.now(),
      text: clean,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMessage]);

    (async () => {
      setIsTyping(true);
      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text,
        }));

        // Bloque de contexto a partir del CSV
        const csvContextBlock = csvSummary
          ? `\n\n[Contexto de datos cargados]\n${buildAIContext(csvSummary)}`
          : "";
        const systemWithContext = SYSTEM + csvContextBlock;

        const { text: reply } = await geminiChat({
          messages: history,
          system: systemWithContext,
          generationConfig: { temperature: 0.2 },
        });

        const aiMessage = {
          id: Date.now() + 1,
          text: reply,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        const aiMessage = {
          id: Date.now() + 1,
          text: `Error con Gemini: ${err?.message ?? String(err)}`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  // Demo (no cambia nada del CSV; solo para jugar)
  const simulateScenario = () => {
    setKpis((prev) => ({
      revenue: prev.revenue * 1.05,
      netProfit: prev.netProfit * 1.03,
      cashFlow: prev.cashFlow * 1.08,
      budgetVariance: prev.budgetVariance * 0.95,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 text-white shadow-md">
        <div className="bg-[#EB0029]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/LogoBanorte.png" alt="Banorte" className="h-7 w-auto" />
              <h1 className="text-sm sm:text-base md:text-lg font-semibold tracking-wide uppercase">
                Copiloto Financiero Banorte
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`}
                />
                {isConnected ? "Conectado" : "Desconectado"}
              </span>
              {isConnected ? (
                <Wifi className="w-5 h-5 text-white/90 sm:hidden" />
              ) : (
                <WifiOff className="w-5 h-5 text-white/90 sm:hidden" />
              )}
            </div>
          </div>
        </div>
        <div className="bg-[#C70021]">
          <nav className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-10 flex items-center gap-6 text-sm">
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">
              Resumen
            </button>
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">
              Cuentas
            </button>
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">
              Gastos
            </button>
            <button className="font-medium border-b-2 border-transparent hover:border-white transition">
              Presupuesto
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* KPI cards con insights financieros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                title="Tasa de ahorro (últ. mes)"
                value={insights ? insights.savingsRate : 0}
                suffix="%"
                badge={insights?.badges.savingsBadge}
                note="Meta sugerida ≥ 20%"
              />
              <KPICard
                title="Relación gasto/ingreso (últ. mes)"
                value={insights ? insights.spendToIncome : 0}
                suffix="%"
                badge={insights?.badges.ratioBadge}
                note="Ideal ≤ 80%"
              />
              <KPICard
                title="Tendencia neta (3 meses)"
                value={insights ? insights.trend3m : 0}
                suffix="%"
                badge={insights?.badges.trendBadge}
                note="Comparado con los 3 meses previos"
              />
              <KPICard
                title="Concentración del gasto (Top categoría)"
                value={insights ? insights.topShare : 0}
                suffix="%"
                badge={insights?.badges.topBadge}
                note={insights ? `Top: ${insights.topCategory}` : "Top: N/A"}
              />
            </div>

            {/* ÚNICO gráfico: gasto por categoría del último mes (con título) */}
            <ExpenseBreakdownChart
              data={expenseData}
              title={`Gasto por Categoría — ${selectedMonth ?? "Último mes"}`}
            />

            <div className="flex justify-center">
              <button
                onClick={simulateScenario}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 hover:scale-105 transition-all duration-300"
              >
                Simular Escenario Demo
              </button>
            </div>
          </div>

          {/* Col derecha: Chat + Acciones */}
          <div className="lg:col-span-1 space-y-6">
            <ChatInterface
              messages={messages}
              isTyping={isTyping}
              isConnected={isConnected}
              onSendMessage={sendMessage}
            />

            {/* Carga y análisis local de CSV */}
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white shadow-md p-4">
              <h3 className="font-semibold text-gray-900">Demo cargar csv</h3>
              <label className="block w-full px-4 py-3 rounded-xl bg-[#EE0027] text-white text-center hover:bg-[#C70021] cursor-pointer transition-colors duration-200 font-medium">
                Cargar CSV
                <input type="file" accept=".csv" onChange={handleCSVFile} className="sr-only" />
              </label>
              {!!csvOut && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <pre className="text-xs whitespace-pre-wrap text-gray-800 font-mono">
                    {csvOut}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
