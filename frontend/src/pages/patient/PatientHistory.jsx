import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import DayScanCard from "../../components/DayScanCard";

export default function PatientHistory() {
  const [scans, setScans] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/scans/my")
      .then((r) => setScans(r.data))
      .catch((e) => setErr(e.response?.data?.detail || "Failed to load"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <Link to="/patient/home" className="text-sm text-emerald-700">
        ← Home
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">History</h1>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {scans.map((s) => (
          <DayScanCard key={s.id} scan={s} />
        ))}
      </div>
      {scans.length === 0 && !err && (
        <p className="mt-8 text-center text-sm text-slate-500">No scans yet.</p>
      )}
    </div>
  );
}
