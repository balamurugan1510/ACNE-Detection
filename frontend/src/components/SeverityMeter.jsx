export default function SeverityMeter({ score = 0 }) {
  const pct = Math.min(100, Math.max(0, score));
  let bar = "bg-emerald-500";
  if (pct > 29) bar = "bg-yellow-500";
  if (pct > 54) bar = "bg-orange-500";
  if (pct > 74) bar = "bg-red-600";
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{pct.toFixed(0)} / 100</p>
    </div>
  );
}
