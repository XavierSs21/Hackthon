import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function mxn(n) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    return n;
  }
}

/**
 * Normaliza cada renglón a:
 * { label, presupuesto, real, variacion }
 * Acepta: categoria|name|label, presupuesto|budget, real|gasto|spent|value,
 * variacion|diferencia|diff (si no hay, se calcula real - presupuesto)
 */
function normalizeBudgetRow(row) {
  const label = row.categoria ?? row.name ?? row.label ?? "";
  const presupuesto = row.presupuesto ?? row.budget ?? row.plan ?? 0;
  const real = row.real ?? row.gasto ?? row.spent ?? row.value ?? 0;

  let variacion = row.variacion ?? row.diferencia ?? row.diff;
  if (variacion === undefined || variacion === null || Number.isNaN(Number(variacion))) {
    variacion = Number(real || 0) - Number(presupuesto || 0);
  }

  return {
    label: String(label),
    presupuesto: Number(presupuesto || 0),
    real: Number(real || 0),
    variacion: Number(variacion || 0),
  };
}

export default function BudgetVarianceChart({ data }) {
  const rows = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    // Si solo viene “gasto por categoría” (sin presupuesto), igual lo mostramos
    const normalized = arr.map(normalizeBudgetRow).filter((d) => d.label);
    return normalized;
  }, [data]);

  if (!rows.length) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm border">
        <div className="text-sm font-semibold mb-1">Presupuesto vs Real</div>
        <div className="text-sm text-gray-500">Sin datos — carga un CSV para ver la gráfica.</div>
      </div>
    );
  }

  // Detectar si hay presupuesto; si no, mostramos solo "real"
  const hasBudget = rows.some((r) => r.presupuesto && r.presupuesto !== 0);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border">
      <div className="text-sm font-semibold mb-4">Presupuesto vs Real por categoría</div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={mxn} />
          <Tooltip formatter={(v, name) => [mxn(v), name]} />
          <Legend />
          {hasBudget && <Bar dataKey="presupuesto" name="Presupuesto" />}
          <Bar dataKey="real" name="Real" />
        </BarChart>
      </ResponsiveContainer>
      {!hasBudget && (
        <div className="text-xs text-gray-500 mt-2">
          * No se detectó una columna de presupuesto; se grafica solo el gasto real por categoría.
        </div>
      )}
    </div>
  );
}
