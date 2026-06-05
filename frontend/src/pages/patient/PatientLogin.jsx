import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function PatientLogin() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [devOtp, setDevOtp] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState("");

  useEffect(() => {
    if (step !== "otp" || !expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step, expiresAt]);

  const remaining =
    expiresAt && expiresAt > now
      ? Math.ceil((expiresAt - now) / 1000 / 60)
      : 0;

  async function sendOtp(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/patient/request-otp", { phone });
      setDevOtp(data.dev_otp ?? null);
      setStep("otp");
      setExpiresAt(Date.now() + 10 * 60 * 1000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Failed to send OTP");
    }
  }

  async function verify(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/patient/verify-otp", { phone, otp });
      setToken(data.access_token);
      navigate("/patient/home");
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Verification failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-slate-900">Patient login</h1>
      <p className="mt-2 text-sm text-slate-600">
        Use the phone number your doctor registered for you.{" "}
        <Link to="/" className="text-emerald-700 underline">
          Home
        </Link>
      </p>
      {step === "phone" && (
        <form onSubmit={sendOtp} className="mt-8 space-y-4">
          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          )}
          <div>
            <label className="block text-sm font-medium">Phone number</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
          >
            Send OTP
          </button>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={verify} className="mt-8 space-y-4">
          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          )}
          {devOtp != null && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Dev OTP: <strong>{devOtp}</strong>
            </div>
          )}
          <p className="text-sm text-slate-600">
            Code expires in ~{remaining} min (10 min window)
          </p>
          <div>
            <label className="block text-sm font-medium">6-digit OTP</label>
            <input
              required
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
          >
            Verify
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-600 underline"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setDevOtp(null);
            }}
          >
            Change phone number
          </button>
        </form>
      )}
    </div>
  );
}
