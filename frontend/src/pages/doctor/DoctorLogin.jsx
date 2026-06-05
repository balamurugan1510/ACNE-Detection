import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function DoctorLogin() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/doctor/login", { email, password });
      setToken(data.access_token);
      navigate("/doctor/dashboard");
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Login failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-slate-900">Doctor login</h1>
      <p className="mt-2 text-sm text-slate-600">
        New here?{" "}
        <Link to="/doctor/register" className="text-emerald-700 underline">
          Register
        </Link>
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {err && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
