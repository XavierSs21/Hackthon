// src/lib/csvToSummary.js
import Papa from "papaparse";

const normalizeNumber = (v) =>
  typeof v === "number"
    ? v
    : Number(String(v ?? "0").replace(/[^0-9.-]/g, "")) || 0;

const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function mapRowSpanish(r) {
  const d = new Date(r.fecha);
  const tipo = String(r.tipo || "").trim().toLowerCase();
  return {
    date: isNaN(d) ? null : d,
    type:
      tipo === "ingreso" || tipo === "income"
        ? "income"
        : tipo === "gasto" || tipo === "expense"
        ? "expense"
        : "",
    category: (r.categoria ?? "Sin categoría").toString().trim(),
    amount: normalizeNumber(r.monto),
    id_usuario: r.id_usuario ?? null,
    descripcion: r.descripcion ?? "",
  };
}

function accumRow(row, acc) {
  if (!row.date || (row.type !== "income" && row.type !== "expense")) return;

  acc.txCount++;
  const key = monthKey(row.date);
  const rec = acc.byMonth.get(key) || { income: 0, expense: 0 };

  if (row.type === "income") {
    acc.incomeTotal += row.amount;
    rec.income += row.amount;
  } else {
    acc.expenseTotal += row.amount;
    rec.expense += row.amount;

    // total por categoría (global)
    acc.expenseByCat.set(
      row.category,
      (acc.expenseByCat.get(row.category) || 0) + row.amount
    );

    // **** NUEVO: por mes y categoría ****
    const mapForMonth =
      acc.expenseByCatByMonth.get(key) || new Map();
    mapForMonth.set(
      row.category,
      (mapForMonth.get(row.category) || 0) + row.amount
    );
    acc.expenseByCatByMonth.set(key, mapForMonth);
  }

  acc.byMonth.set(key, rec);
}

function finalizeSummary(acc) {
  const netTotal = acc.incomeTotal - acc.expenseTotal;

  const cashFlowByMonth = Array.from(acc.byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([m, v]) => ({
      month: m,
      income: +v.income.toFixed(2),
      expense: +v.expense.toFixed(2),
      net: +(v.income - v.expense).toFixed(2),
    }));

  const expenseBreakdown = Array.from(acc.expenseByCat.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount: +amount.toFixed(2) }));

  // **** NUEVO: objeto { "YYYY-MM": [{category, amount}, ...] }
  const expenseBreakdownByMonth = {};
  for (const [m, catMap] of acc.expenseByCatByMonth.entries()) {
    expenseBreakdownByMonth[m] = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount: +amount.toFixed(2),
      }));
  }

  return {
    kpis: {
      incomeTotal: +acc.incomeTotal.toFixed(2),
      expenseTotal: +acc.expenseTotal.toFixed(2),
      netTotal: +netTotal.toFixed(2),
      txCount: acc.txCount,
    },
    cashFlowByMonth,               // [{ month, income, expense, net }]
    expenseBreakdown,              // global (sigue por si lo necesitas)
    expenseBreakdownByMonth,       // **** NUEVO ****
    budgetVariance: [],
    raw: null,
  };
}

export function parseCSVFile(file, opts = {}) {
  const wantUser = opts.userId != null ? String(opts.userId) : null;

  return new Promise((resolve, reject) => {
    const acc = {
      incomeTotal: 0,
      expenseTotal: 0,
      txCount: 0,
      byMonth: new Map(),
      expenseByCat: new Map(),
      expenseByCatByMonth: new Map(), // **** NUEVO ****
    };

    Papa.parse(file, {
      header: true,
      worker: true,
      skipEmptyLines: true,
      dynamicTyping: { monto: true, id_usuario: true },
      chunk: (results) => {
        const rows = (results && results.data) || [];
        for (const r of rows) {
          if (wantUser != null && String(r.id_usuario) !== wantUser) continue;
          const m = mapRowSpanish(r);
          accumRow(m, acc);
        }
      },
      complete: (results) => {
        const errs = (results && results.errors) ? results.errors : [];
        if (errs.length) console.warn("CSV parse warnings:", errs.slice(0, 3));
        try {
          resolve(finalizeSummary(acc));
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}
