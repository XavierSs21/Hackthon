"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

import KPICard from "./components/KPICard";
import CashFlowChart from "./components/CashFlowChart";
import BudgetVarianceChart from "./components/BudgetVarianceChart";
import ExpenseBreakdownChart from "./components/ExpenseBreakdownChart";
import ChatInterface from "./components/ChatInterface";
// Si no tienes este componente, puedes comentar la siguiente línea:
import MCPQuickTest from "./components/MCPQuickTest";


import {
  initialKPIs,
  initialCashFlowData,
  initialBudgetData,
  initialExpenseData,
  initialMessages,
} from "./data/mockData";

import { callTool, unwrapText } from "./lib/mcp"; // <- usa mcp.js (no TS)

/** Simple parser de slash-commands del chat. */
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

  return null;
}

export default function App() {
  // Estado principal de la aplicación
  const [kpis, setKpis] = useState(initialKPIs);
  const [cashFlowData, setCashFlowData] = useState(initialCashFlowData);
  const [budgetData, setBudgetData] = useState(initialBudgetData);
  const [expenseData, setExpenseData] = useState(initialExpenseData);
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // PING real al bridge (quita la simulación)
  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const base = import.meta.env.VITE_BRIDGE_URL;
        const r = await fetch(`${base}/health`, { cache: "no-store" });
        if (!alive) return;
        setIsConnected(r.ok);
      } catch {
        if (!alive) return;
        setIsConnected(false);
      } finally {
        if (alive) setTimeout(poll, 2000); // reintenta cada 2s
      }
    }

    poll();
    return () => {
      alive = false;
    };
  }, []);

  // Enviar mensaje del usuario (con soporte a slash-commands)
  const sendMessage = (text) => {
    const userMessage = {
      id: Date.now(),
      text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Intentar comando MCP primero
    const cmd = trySlashCommand(text);
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
      return; // no uses respuesta simulada si ejecutaste tool real
    }

    // Si no fue comando, usa la respuesta simulada original
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = generateAIResponse(text);
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, aiMessage]);
    }, 1500);
  };

  // Respuestas simuladas (tu lógica original)
  const generateAIResponse = (userText) => {
    const lowerText = userText.toLowerCase();

    if (lowerText.includes("simula") || lowerText.includes("simulación")) {
      simulateScenario();
      return "He aplicado la simulación. Los gráficos se han actualizado con las nuevas proyecciones. Puedes ver los cambios reflejados en el dashboard.";
    }

    if (lowerText.includes("flujo") || lowerText.includes("cash flow")) {
      return `El flujo de caja actual es de ${formatCurrency(kpis.cashFlow)} MXN. La tendencia muestra una ligera disminución del 3.2% respecto al periodo anterior, principalmente debido a inversiones en tecnología.`;
    }

    if (lowerText.includes("beneficio") || lowerText.includes("profit")) {
      return `El beneficio neto actual es de ${formatCurrency(kpis.netProfit)} MXN, con un crecimiento del 12.3% respecto al trimestre anterior. La mejora se debe principalmente a la reducción de costos operativos.`;
    }

    if (lowerText.includes("presupuesto") || lowerText.includes("budget")) {
      return `La variación presupuestaria actual es de ${formatCurrency(kpis.budgetVariance)} MXN. Esto representa un 2.1% por debajo del presupuesto planificado. Los departamentos de Marketing y TI están ligeramente sobre presupuesto.`;
    }

    return "Entiendo tu consulta. ¿Podrías ser más específico sobre qué métrica financiera te gustaría analizar? Puedo ayudarte con flujo de caja, beneficios, presupuestos o realizar simulaciones de escenarios.";
  };

  // Simular escenario con cambios en los datos (tu lógica original)
  const simulateScenario = () => {
    setKpis((prev) => ({
      revenue: prev.revenue * 1.05,
      netProfit: prev.netProfit * 1.03,
      cashFlow: prev.cashFlow * 1.08,
      budgetVariance: prev.budgetVariance * 0.95,
    }));

    setCashFlowData((prev) =>
      prev.map((item, index) =>
        index >= 9 ? { ...item, proyectado: item.proyectado * 1.08 } : item
      )
    );

    setBudgetData((prev) => prev.map((item) => ({ ...item, real: item.real * 1.03 })));
  };

  // Helper para formatear moneda
  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 text-white shadow-md">
        {/* Barra superior roja */}
        <div className="bg-[#EE0027]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Left: logo + brand */}
            <div className="flex items-center gap-3">
              <img src="/LogoBanorte.png" alt="Banorte" className="h-7 w-auto" />
              <h1 className="text-sm sm:text-base md:text-lg font-semibold tracking-wide uppercase">
                Copiloto Financiero Banorte
              </h1>
            </div>

            {/* Right: connection status */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-400" : "bg-red-400"
                  }`}
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

        {/* Sub-bar opcional */}
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

      {/* Layout principal */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Dashboard (65%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard title="Ingresos" value={kpis.revenue} change={8.5} trend="up" />
              <KPICard title="Beneficio Neto" value={kpis.netProfit} change={12.3} trend="up" />
              <KPICard title="Flujo de Caja" value={kpis.cashFlow} change={-3.2} trend="down" />
              <KPICard title="Variación Presupuestaria" value={kpis.budgetVariance} change={-2.1} trend="down" />
            </div>

            {/* Gráfico de Flujo de Caja */}
            <CashFlowChart data={cashFlowData} />

            {/* Gráficos de Presupuesto y Gastos */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <BudgetVarianceChart data={budgetData} />
              <ExpenseBreakdownChart data={expenseData} />
            </div>

            {/* Botón de simulación */}
            <div className="flex justify-center">
              <button
                onClick={simulateScenario}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 hover:scale-105 transition-all duration-300"
              >
                Simular Escenario Demo
              </button>
            </div>
          </div>

          {/* Columna derecha: Chat (35%) + Panel MCP */}
          <div className="lg:col-span-1 space-y-6">
            <ChatInterface
              messages={messages}
              isTyping={isTyping}
              isConnected={isConnected}
              onSendMessage={sendMessage}
            />

            {/* Panel MCP para validar conexión (opcional) */}
            {typeof MCPQuickTest !== "undefined" && <MCPQuickTest />}
          </div>
        </div>
      </main>
    </div>
  );
}
