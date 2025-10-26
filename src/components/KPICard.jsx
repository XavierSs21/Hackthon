import React from "react";

/**
 * Props:
 * - title: string
 * - value: string|number (ya formateado o crudo)
 * - suffix?: string (ej. "%")
 * - badge?: { label: string, tone: "good" | "warn" | "bad" }
 * - note?: string (texto pequeño debajo)
 */
export default function KPICard({ title, value, suffix = "", badge, note }) {
  const isNumber = typeof value === "number";
  const display = isNumber ? value.toLocaleString("es-MX", { maximumFractionDigits: 1 }) : value;

  const toneMap = {
    good: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warn: "bg-amber-100 text-amber-800 border-amber-200",
    bad: "bg-red-100 text-red-700 border-red-200",
  };
  const badgeCls = badge ? toneMap[badge.tone] : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-gray-600">{title}</div>
        {badge?.label && (
          <span className={`text-xs px-2 py-1 rounded-full border ${badgeCls}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">
        {isNumber ? display : value}{suffix}
      </div>
      {note && <div className="mt-1 text-xs text-gray-500">{note}</div>}
    </div>
  );
}
