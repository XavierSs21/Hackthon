import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
 * Normaliza a: { name, value }
 * Acepta: name|categoria|label para nombre; value|amount|gasto|gastos para valor
 */
function normalizeExpenseRow(row) {
  const name = row.name ?? row.categoria ?? row.label ?? "Otro";
  const value = row.value ?? row.amount ?? row.gasto ?? row.gastos ?? 0;
  return { name: String(name), value: Number(value || 0) };
}

const FALLBACK_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#eab308", "#8b5cf6",
  "#06b6d4", "#f97316", "#14b8a6", "#f43f5e", "#84cc16",
];

export default function ExpenseBreakdownChart({ data }) {
  const rows = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    const n = arr.map(normalizeExpenseRow).filter((d) => d.value > 0);
    return n;
  }, [data]);

  if (!rows.length) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm border">
        <div className="text-sm font-semibold mb-1">Gasto por categoría</div>
        <div className="text-sm text-gray-500">Sin datos — carga un CSV para ver la gráfica.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border">
      <div className="text-sm font-semibold mb-4">Distribución de gastos</div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v, name) => [mxn(v), name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
