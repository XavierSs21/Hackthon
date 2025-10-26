import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  Line,
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
 * Adapta datos de CSV o mocks a un formato unificado:
 * { label, ingresos, gastos, neto }
 * Acepta campos: mes|month|label, ingresos|inflow, gastos|outflow,
 * neto|balance|value|actual|proyectado
 */
function normalizeCashflowRow(row) {
  const label = row.label ?? row.month ?? row.mes ?? row.fecha ?? row.periodo ?? "";
  const ingresos =
    row.ingresos ?? row.inflow ?? row.entrada ?? row.incomes ?? row.revenue ?? row.revenues ?? 0;
  const gastos =
    row.gastos ?? row.outflow ?? row.egresos ?? row.expenses ?? row.costos ?? row.cost ?? 0;
  const neto =
    row.neto ??
    row.balance ??
    row.value ??
    row.actual ??
    row.proyectado ??
    (Number(ingresos || 0) - Number(gastos || 0));

  return {
    label: String(label),
    ingresos: Number(ingresos || 0),
    gastos: Number(gastos || 0),
    neto: Number(neto || 0),
  };
}

export default function CashFlowChart({ data }) {
  const rows = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    return arr.map(normalizeCashflowRow).filter((d) => d.label);
  }, [data]);

  if (!rows.length) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm border">
        <div className="text-sm font-semibold mb-1">Flujo de Caja</div>
        <div className="text-sm text-gray-500">Sin datos — carga un CSV para ver la gráfica.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border">
      <div className="text-sm font-semibold mb-4">Flujo de Caja</div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={mxn} />
          <Tooltip
            formatter={(v, name) => [mxn(v), name]}
            labelFormatter={(l) => `Periodo: ${l}`}
          />
          <Legend />
          <Bar dataKey="ingresos" name="Ingresos" />
          <Bar dataKey="gastos" name="Gastos" />
          <Line type="monotone" dataKey="neto" name="Neto" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
