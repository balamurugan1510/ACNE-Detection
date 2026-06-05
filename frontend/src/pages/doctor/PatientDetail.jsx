import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api/client";
import DayScanCard from "../../components/DayScanCard";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [trend, setTrend] = useState(null);
  const [scans, setScans] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [p, tr, sc] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/dashboard/patient/${id}/trend`),
        api.get(`/scans/patient/${id}`),
      ]);
      setPatient(p.data);
      setTrend(tr.data);
      setScans(sc.data);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status) {
    try {
      await api.patch(`/patients/${id}`, { treatment_status: status });
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Update failed");
    }
  }

  if (!patient && !err) {
    return (
      <div className="p-8 text-center text-slate-500">Loading…</div>
    );
  }

  const chartData = trend?.chart_data || [];
  const td = patient?.tracking_days || 30;
  const dc = patient?.days_completed || 0;
  const pct = td ? Math.min(100, (dc / td) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/doctor/patients" className="text-sm text-emerald-700">
            ← Patients
          </Link>
          <button
            type="button"
            onClick={() => navigate("/doctor/dashboard")}
            className="text-sm text-slate-600"
          >
            Dashboard
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {err && <div className="mb-4 text-sm text-red-600">{err}</div>}
        {patient && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <p className="text-slate-600">{patient.phone}</p>
              <p className="mt-2 text-sm capitalize text-slate-500">
                Region: {patient.face_region?.replace("_", " ")}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Progress</span>
                  <span>
                    {dc} / {td} days
                  </span>
                </div>
                <div className="mt-1 h-3 w-full rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("paused")}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("active")}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-900"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("completed")}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  Mark complete
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Severity trend</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" name="Day" />
                    <YAxis
                      yAxisId="left"
                      label={{ value: "Acne count", angle: -90, position: "insideLeft" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      label={{ value: "Severity", angle: 90, position: "insideRight" }}
                    />
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(d) => `Day ${d}`}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="acne_count"
                      stroke="#2563eb"
                      name="Acne count"
                      dot={false}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="severity_score"
                      fill="#fb923c"
                      stroke="#ea580c"
                      fillOpacity={0.3}
                      name="Severity score"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-4 font-semibold text-slate-900">Scan gallery</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {scans.map((s) => (
                  <DayScanCard key={s.id} scan={s} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
