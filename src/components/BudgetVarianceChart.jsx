import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

function EmptyState({ title = "Sin datos de presupuesto vs real" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
      {title}
    </div>
  );
}

export default function BudgetVarianceChart({ data = [] }) {
  const safe = Array.isArray(data) ? data : [];
  if (!safe.length) return <EmptyState />;

  // Dominios seguros
  const vals = safe.flatMap((d) => [d.budget ?? 0, d.actual ?? 0, d.variance ?? 0]);
  const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const yDomain = [0, maxAbs * 1.2];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow">
      <h3 className="font-semibold text-gray-900 mb-2">Presupuesto vs Real</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safe}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis domain={yDomain} />
            <Tooltip formatter={(v) => v?.toLocaleString("es-MX")} />
            <Legend />
            <Bar dataKey="budget" name="Presupuesto" />
            <Bar dataKey="actual" name="Real" />
            <ReferenceLine y={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Variance table */}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr>
              <th className="py-1 pr-3">Categoría</th>
              <th className="py-1 text-right">Presupuesto</th>
              <th className="py-1 text-right">Real</th>
              <th className="py-1 text-right">Varianza</th>
            </tr>
          </thead>
          <tbody>
            {safe.map((r, i) => (
              <tr key={i} className="border-t last:border-b">
                <td className="py-1 pr-3">{r.category}</td>
                <td className="py-1 text-right">${Number(r.budget ?? 0).toLocaleString("es-MX")}</td>
                <td className="py-1 text-right">${Number(r.actual ?? 0).toLocaleString("es-MX")}</td>
                <td className={`py-1 text-right ${Number(r.variance ?? 0) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ${Number(r.variance ?? 0).toLocaleString("es-MX")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
