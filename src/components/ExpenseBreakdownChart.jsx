import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

function EmptyState({ title = "Sin datos de gastos por categoría" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
      {title}
    </div>
  );
}

const PALETTE = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#22c55e", "#0ea5e9",
  "#a3e635", "#eab308", "#fb7185", "#38bdf8", "#c084fc",
];

export default function ExpenseBreakdownChart({ data = [], title = "Gasto por Categoría" }) {
  const safe = (Array.isArray(data) ? data : []).filter(d => (d?.amount ?? 0) > 0);
  if (!safe.length) return <EmptyState title="Sin datos del mes seleccionado" />;

  // Top 10 + "Otros"
  const sorted = [...safe].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  const othersTotal = rest.reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const pieData = othersTotal > 0 ? [...top, { category: "Otros", amount: othersTotal }] : top;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={(v) => v?.toLocaleString("es-MX")} />
            <Legend />
            <Pie
              data={pieData}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label={(d) => `${d.category}`}
              labelLine={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
