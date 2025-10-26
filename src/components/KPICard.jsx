// src/components/KPICard.jsx
import React from "react";

function fmtMXN(n) {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtPct(n) {
  if (!isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

export default function KPICard({
  title,
  value,
  unit = "mxn",          // 'mxn' | 'pct' | 'none'
  deltaPct = null,       // número: variación vs mes anterior
  goodWhenUp = true,     // en gastos pon false (bajar es bueno)
  caption,               // subtítulo opcional
}) {
  const formatted =
    unit === "mxn" ? fmtMXN(value) :
    unit === "pct" ? fmtPct(value) :
    (value ?? "—");

  const isUp = (deltaPct ?? 0) >= 0;
  const isGood = goodWhenUp ? isUp : !isUp;
  const arrow = isUp ? "▲" : "▼";
  const deltaText = isFinite(deltaPct) ? `${arrow} ${Math.abs(deltaPct).toFixed(1)}% vs mes anterior` : "–";
  const chipClass = isGood ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${chipClass}`}>
          {deltaText}
        </span>
      </div>

      <div className="mt-2 text-2xl font-semibold text-gray-900">
        {formatted}
      </div>

      {caption && (
        <div className="mt-1 text-xs text-gray-500">
          {caption}
        </div>
      )}
    </div>
  );
}
