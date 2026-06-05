export default function TrendBadge({ trend }) {
  const map = {
    improving: { label: "Improving", className: "bg-emerald-100 text-emerald-800" },
    worsening: { label: "Worsening", className: "bg-red-100 text-red-800" },
    stable: { label: "Stable", className: "bg-slate-200 text-slate-700" },
    insufficient_data: {
      label: "Insufficient data",
      className: "bg-slate-100 text-slate-600",
    },
  };
  const m = map[trend] || map.insufficient_data;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.className}`}
    >
      {m.label}
    </span>
  );
}
