import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function EmptyState({ title = "Sin datos para el flujo de caja" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
      {title}
    </div>
  );
}

export default function CashFlowChart({ data = [] }) {
  const safe = Array.isArray(data) ? data : [];
  if (!safe.length) return <EmptyState />;

  // Eje Y dinámico
  const values = safe.flatMap((d) => [d.income ?? 0, d.expense ?? 0, d.net ?? 0]);
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const yDomain = [-maxAbs * 1.1, maxAbs * 1.1];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow">
      <h3 className="font-semibold text-gray-900 mb-2">Flujo de Caja por Mes</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Barras income/expense */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safe}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={yDomain} />
              <Tooltip formatter={(v) => v?.toLocaleString("es-MX")} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" />
              <Bar dataKey="expense" name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Línea net */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safe}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={yDomain} />
              <Tooltip formatter={(v) => v?.toLocaleString("es-MX")} />
              <Legend />
              <Line type="monotone" dataKey="net" name="Neto" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
