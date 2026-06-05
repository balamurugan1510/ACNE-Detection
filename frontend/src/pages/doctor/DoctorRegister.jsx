import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function DoctorRegister() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialization: "Dermatologist",
  });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/doctor/register", {
        ...form,
        phone: form.phone || null,
      });
      setToken(data.access_token);
      navigate("/doctor/dashboard");
    } catch (ex) {
      setErr(
        typeof ex.response?.data?.detail === "string"
          ? ex.response.data.detail
          : "Registration failed"
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-slate-900">Doctor registration</h1>
      <p className="mt-2 text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/doctor/login" className="text-emerald-700 underline">
          Login
        </Link>
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {err && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Full name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Specialization</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Create account
        </button>
      </form>
    </div>
  );
}
