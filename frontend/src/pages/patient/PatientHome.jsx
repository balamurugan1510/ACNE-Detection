import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import NotificationBanner from "../../components/NotificationBanner";

export default function PatientHome() {
  const { logout, userName } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [scans, setScans] = useState([]);
  const [err, setErr] = useState("");
  const [dismissBanner, setDismissBanner] = useState(false);

  async function load() {
    try {
      const [p, s] = await Promise.all([api.get("/patients/me"), api.get("/scans/my")]);
      setProfile(p.data);
      setScans(s.data);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const todayScan = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return scans.find((sc) => sc.captured_at && sc.captured_at.slice(0, 10) === today);
  }, [scans]);

  const last7 = useMemo(() => {
    const done = scans.filter((s) => s.inference_status === "done");
    return done.slice(-7).map((s) => ({
      day: s.day_number,
      count: s.acne_count,
    }));
  }, [scans]);

  const td = profile?.tracking_days || 30;
  const dc = profile?.days_completed || 0;
  const ringPct = td ? Math.min(100, (dc / td) * 100) : 0;

  const showBanner =
    !dismissBanner &&
    profile?.treatment_status === "active" &&
    !todayScan;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Hello, {userName}</h1>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/patient/login");
            }}
            className="text-sm text-slate-600"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {showBanner && (
          <NotificationBanner
            message="You have not submitted today's photo yet."
            onDismiss={() => setDismissBanner(true)}
          />
        )}
        {profile && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Today&apos;s focus</p>
              <p className="mt-1 text-lg font-medium capitalize text-slate-900">
                {profile.face_region?.replace("_", " ") || "Full face"}
              </p>
              {todayScan ? (
                <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-900">
                  <p className="font-medium">Submitted ✓</p>
                  {todayScan.inference_status === "done" && (
                    <p className="mt-1 text-sm">
                      Lesions: {todayScan.acne_count} · {todayScan.severity_label}
                    </p>
                  )}
                  {todayScan.inference_status === "pending" ||
                  todayScan.inference_status === "processing" ? (
                    <p className="mt-1 text-sm">Analysing photo…</p>
                  ) : null}
                  {todayScan.inference_status === "failed" && (
                    <p className="mt-1 text-sm text-red-700">{todayScan.inference_error}</p>
                  )}
                </div>
              ) : (
                <Link
                  to="/patient/upload"
                  className="mt-4 block rounded-lg bg-emerald-600 py-3 text-center font-medium text-white hover:bg-emerald-700"
                >
                  Take photo today
                </Link>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center">
              <div className="relative h-36 w-36">
                <svg className="-rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3"
                    strokeDasharray={`${ringPct}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{dc}</span>
                  <span className="text-xs text-slate-500">/ {td} days</span>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-medium text-slate-700">Last 7 days (acne count)</h2>
              <div className="mt-2 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last7}>
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                to="/patient/upload"
                className="flex-1 rounded-lg border border-slate-300 py-2 text-center text-sm font-medium"
              >
                Upload
              </Link>
              <Link
                to="/patient/history"
                className="flex-1 rounded-lg border border-slate-300 py-2 text-center text-sm font-medium"
              >
                History
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
