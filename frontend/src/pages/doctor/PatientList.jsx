import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import TrendBadge from "../../components/TrendBadge";

export default function PatientList() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const onboarded = location.state?.onboarded;

  useEffect(() => {
    api
      .get("/patients")
      .then((r) => setRows(r.data))
      .catch((e) => setErr(e.response?.data?.detail || "Failed to load"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/doctor/dashboard" className="text-sm text-emerald-700">
            ← Dashboard
          </Link>
          <div className="flex gap-2">
            <Link
              to="/doctor/patients/new"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
            >
              New patient
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/doctor/login");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-bold text-slate-900">Patients</h1>
        {onboarded && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Patient onboarded successfully.
          </div>
        )}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Phone
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => navigate(`/doctor/patients/${r.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.phone}</td>
                  <td className="px-4 py-3 text-sm capitalize">{r.treatment_status}</td>
                  <td className="px-4 py-3">
                    <TrendBadge trend={r.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
