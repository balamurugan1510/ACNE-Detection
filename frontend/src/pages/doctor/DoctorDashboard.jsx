import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import TrendBadge from "../../components/TrendBadge";

export default function DoctorDashboard() {
  const { logout, userName } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [o, t] = await Promise.all([
          api.get("/dashboard/overview"),
          api.get("/dashboard/all-trends"),
        ]);
        if (!cancelled) {
          setOverview(o.data);
          setRows(t.data);
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.detail || "Failed to load");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const worsening = overview?.worsening ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Doctor dashboard</h1>
            <p className="text-sm text-slate-500">{userName}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/doctor/patients"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Patients
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/doctor/login");
              }}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {err && <div className="mb-4 text-sm text-red-600">{err}</div>}
        {overview && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total patients" value={overview.total_patients} />
            <StatCard label="Active" value={overview.active} />
            <StatCard label="Improving" value={overview.improving} accent="emerald" />
            <StatCard
              label="Worsening"
              value={overview.worsening}
              highlight={worsening > 0}
            />
          </div>
        )}
        <div className="mt-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-medium text-slate-900">All patients</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Progress
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Latest severity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/doctor/patients/${r.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {r.days_completed} / {r.tracking_days} ({r.progress_pct}%)
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {r.latest_severity != null ? r.latest_severity.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TrendBadge trend={r.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No patients yet.{" "}
              <Link to="/doctor/patients/new" className="text-emerald-700 underline">
                Onboard a patient
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent, highlight }) {
  const red = highlight ? "border-red-300 bg-red-50" : "border-slate-200 bg-white";
  const text =
    accent === "emerald" ? "text-emerald-700" : highlight ? "text-red-800" : "text-slate-900";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${red}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${text}`}>{value}</p>
    </div>
  );
}
