import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-xl font-semibold text-emerald-800">AcneTrack</span>
        <div className="flex gap-3">
          <Link
            to="/doctor/login"
            className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            Doctor login
          </Link>
          <Link
            to="/patient/login"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Patient login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          AI-powered dermatology treatment tracking
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Monitor acne severity over your treatment period with daily photos,
          YOLO-based lesion detection, and clear trends for doctors and patients.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/doctor/register"
            className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg hover:bg-emerald-700"
          >
            Register as doctor
          </Link>
          <Link
            to="/patient/login"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-800 hover:bg-slate-50"
          >
            I am a patient
          </Link>
        </div>
      </main>
    </div>
  );
}
