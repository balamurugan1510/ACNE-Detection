import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

const REGIONS = [
  { value: "full_face", label: "Full Face" },
  { value: "forehead", label: "Forehead" },
  { value: "cheeks", label: "Cheeks" },
  { value: "chin", label: "Chin" },
  { value: "nose", label: "Nose" },
];

export default function OnboardPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    case_notes: "",
    face_region: "full_face",
    tracking_days: 30,
    notification_time: "09:00",
  });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/patients", form);
      navigate("/doctor/patients", { state: { onboarded: true } });
    } catch (ex) {
      setErr(
        typeof ex.response?.data?.detail === "string"
          ? ex.response.data.detail
          : "Failed to create patient"
      );
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <Link to="/doctor/patients" className="text-sm text-emerald-700">
        ← Back to patients
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Onboard patient</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {err && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
        )}
        <div>
          <label className="block text-sm font-medium">Patient name *</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone *</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Case notes</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.case_notes}
            onChange={(e) => setForm({ ...form, case_notes: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Face region</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.face_region}
            onChange={(e) => setForm({ ...form, face_region: e.target.value })}
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Tracking days</label>
          <input
            type="number"
            min={1}
            max={365}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.tracking_days}
            onChange={(e) =>
              setForm({ ...form, tracking_days: parseInt(e.target.value, 10) || 30 })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Notification time (IST)</label>
          <input
            type="time"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.notification_time}
            onChange={(e) => setForm({ ...form, notification_time: e.target.value })}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Save patient
        </button>
      </form>
    </div>
  );
}
