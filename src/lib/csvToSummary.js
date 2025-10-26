// src/lib/csvToSummary.js
import Papa from "papaparse";

/**
 * Parser/transformador de CSV -> { kpis, cashFlowData, budgetData, expenseData, contextText }
 * CSV esperado: fecha(YYYY-MM-DD), categoria, tipo(Ingreso|Gasto), monto
 */
export async function csvToSummary(csvText) {
  const { data, errors } = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (errors?.length) {
    throw new Error("Error al parsear CSV: " + errors[0]?.message);
  }

  // Normaliza filas
  const rows = data
    .map((r) => ({
      fecha: toDate(r.fecha),
      ym: toYearMonth(r.fecha),
      categoria: String(r.categoria ?? "").trim() || "Sin categoría",
      tipo: normalizeTipo(r.tipo),
      monto: toNumber(r.monto),
    }))
    .filter((r) => r.fecha && r.tipo && isFinite(r.monto));

  if (rows.length === 0) {
    throw new Error("CSV vacío o sin filas válidas");
  }

  // ----- Agregados mensuales
  const perMonth = groupBy(rows, (r) => r.ym);
  const months = Object.keys(perMonth).sort(); // asc
  const lastMonth = months[months.length - 1];

  // Serie para cashflow
  const cashFlowData = months.map((ym) => {
    const list = perMonth[ym];
    const ingresos = sum(list.filter((x) => x.tipo === "Ingreso").map((x) => x.monto));
    const gastos = sum(list.filter((x) => x.tipo === "Gasto").map((x) => x.monto));
    const neto = ingresos - gastos;
    return { mes: ym, ingresos, gastos, neto };
  });

  // Totales último mes
  const lastList = perMonth[lastMonth] || [];
  const lastIngresos = sum(lastList.filter((x) => x.tipo === "Ingreso").map((x) => x.monto));
  const lastGastos = sum(lastList.filter((x) => x.tipo === "Gasto").map((x) => x.monto));
  const lastNeto = lastIngresos - lastGastos;

  // Flujo de caja (acumulado 12m)
  const cashFlowAcum12 = sum(cashFlowData.map((x) => x.neto));

  // ----- Presupuesto 50/30/20 del último mes
  const PLAN_E = 0.5; // Esenciales
  const PLAN_D = 0.3; // Discrecionales
  const PLAN_A = 0.2; // Ahorro

  const planEsenciales = lastIngresos * PLAN_E;
  const planDiscrec = lastIngresos * PLAN_D;
  const planAhorro = lastIngresos * PLAN_A;

  // Mapeo de categorías a buckets (ajusta a tus categorías)
  const ESENCIALES = [
    "Renta", "Hipoteca", "Servicios", "Luz", "Agua", "Gas", "Internet",
    "Alimentos", "Supermercado", "Transporte", "Coche", "Gasolina", "Salud",
    "Colegiatura"
  ];
  const DISCRECIONALES = [
    "Restaurantes", "Entretenimiento", "Ropa", "Compras", "Suscripciones",
    "Viajes", "Hobbies"
  ];
  const AHORRO_CATS = ["Ahorro", "Inversión"];

  const lastExpenses = lastList.filter((x) => x.tipo === "Gasto");
  const { realEsenciales, realDiscrec, realAhorro, catBreakdown } =
    bucketize(lastExpenses, ESENCIALES, DISCRECIONALES, AHORRO_CATS, lastIngresos, lastNeto);

  const budgetData = [
    { categoria: "Esenciales", plan: planEsenciales, real: realEsenciales },
    { categoria: "Discrecionales", plan: planDiscrec, real: realDiscrec },
    { categoria: "Ahorro", plan: planAhorro, real: realAhorro },
  ];

  // Pie de gastos por categoría (top N) para último mes
  const expenseData = toPie(catBreakdown);

  // KPIs
  const kpis = {
    revenue: Math.round(lastIngresos),
    netProfit: Math.round(lastNeto),
    cashFlow: Math.round(cashFlowAcum12),
    // Diferencia contra plan de ahorro
    budgetVariance: Math.round(realAhorro - planAhorro),
  };

  // Contexto para el chat
  const contextText = [
    "=== CONTEXTO CSV (resumen) ===",
    `Periodo: ${months[0]} → ${lastMonth} (${months.length} meses)`,
    `Último mes ${lastMonth}: ingresos ${fmt(lastIngresos)}, gastos ${fmt(lastGastos)}, neto ${fmt(lastNeto)}`,
    `Plan 50/30/20 sobre ingresos del último mes: Esenciales ${fmt(planEsenciales)}, Discrecionales ${fmt(planDiscrec)}, Ahorro ${fmt(planAhorro)}`,
    `Real último mes: Esenciales ${fmt(realEsenciales)}, Discrecionales ${fmt(realDiscrec)}, Ahorro ${fmt(realAhorro)}`,
    `Flujo de caja acumulado 12m: ${fmt(cashFlowAcum12)}`,
  ].join("\n");

  return { kpis, cashFlowData, budgetData, expenseData, contextText };
}

/* ----------------- helpers ----------------- */

function toDate(v) {
  try {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
function toYearMonth(v) {
  const d = toDate(v);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function toNumber(v) {
  const n = typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : Number(v);
  return isFinite(n) ? n : 0;
}
function groupBy(arr, keyFn) {
  return arr.reduce((acc, x) => {
    const k = keyFn(x);
    if (!k) return acc;
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}
function sum(list) {
  return list.reduce((a, b) => a + (Number(b) || 0), 0);
}
function inListIgnoreCase(str, list) {
  const s = String(str || "").toLowerCase();
  return list.some((x) => s.includes(String(x).toLowerCase()));
}
function normalizeTipo(t) {
  const s = String(t || "").trim().toLowerCase();
  if (s.startsWith("ingre")) return "Ingreso";
  if (s.startsWith("gast")) return "Gasto";
  return null;
}
function fmt(n) {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `${n}`;
  }
}

/**
 * Asigna gastos a buckets Esenciales/Discrecionales; "Ahorro" se deriva del neto si no hay categoría explícita.
 * - catBreakdown: suma por categoría para el pie chart.
 */
function bucketize(expenses, ESENCIALES, DISCRECIONALES, AHORRO_CATS, lastIngresos, lastNeto) {
  let realEsenciales = 0;
  let realDiscrec = 0;
  let realAhorroCat = 0;

  const perCat = {};
  for (const e of expenses) {
    perCat[e.categoria] = (perCat[e.categoria] || 0) + e.monto;

    if (inListIgnoreCase(e.categoria, AHORRO_CATS)) {
      realAhorroCat += Math.abs(e.monto); // si viene como gasto, lo tomamos como aporte a ahorro
    } else if (inListIgnoreCase(e.categoria, ESENCIALES)) {
      realEsenciales += e.monto;
    } else if (inListIgnoreCase(e.categoria, DISCRECIONALES)) {
      realDiscrec += e.monto;
    } else {
      // por defecto, manda a Discrecionales
      realDiscrec += e.monto;
    }
  }

  // Si no hay registro explícito de Ahorro, lo inferimos del neto:
  // ahorro real = max(0, neto del mes)
  const realAhorro = realAhorroCat > 0 ? realAhorroCat : Math.max(0, lastNeto);

  return {
    realEsenciales,
    realDiscrec,
    realAhorro,
    catBreakdown: perCat,
  };
}

function toPie(catTotals, limit = 8) {
  const entries = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (entries.length <= limit) return entries;

  const top = entries.slice(0, limit - 1);
  const rest = sum(entries.slice(limit - 1).map((x) => x.value));
  return [...top, { name: "Otros", value: rest }];
}
