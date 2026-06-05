import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, getApiOrigin } from "../../api/client";
import DetectionOverlay from "../../components/DetectionOverlay";

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function UploadScan() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scan, setScan] = useState(null);
  const [err, setErr] = useState("");
  /** Dev only: pretend “calendar day” for upload (requires backend dev_mode). */
  const [devCaptureDate, setDevCaptureDate] = useState(todayIsoDate);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const id = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr("");
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    if (notes) fd.append("notes", notes);
    if (import.meta.env.DEV) {
      fd.append("dev_capture_date", devCaptureDate);
    }
    try {
      const { data } = await api.post("/scans/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setScan(data);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const base = getApiOrigin();
  const resultImageUrl = scan?.image_url ? `${base}${scan.image_url}` : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <Link to="/patient/home" className="text-sm text-emerald-700">
        ← Home
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Upload today&apos;s photo</h1>
      <p className="mt-1 text-sm text-slate-600">
        Use your camera — the capture field opens the rear camera on mobile.
      </p>

      {import.meta.env.DEV && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold text-amber-900">Dev: capture day</p>
          <p className="mt-1 text-amber-900/90">
            One scan per calendar day is enforced on the server. Here you can pick which day this upload counts as
            (backend <code className="rounded bg-amber-100 px-1">dev_mode</code> only).
          </p>
          <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-amber-900/80">
            Date for this upload
          </label>
          <input
            type="date"
            value={devCaptureDate}
            onChange={(e) => setDevCaptureDate(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-900"
          />
          <p className="mt-2 font-mono text-xs text-amber-900/80">
            Browser now: {nowTick.toLocaleString()}
          </p>
          <p className="mt-1 font-mono text-xs text-amber-900/80">
            Selected ISO day: <strong>{devCaptureDate}</strong>
          </p>
        </div>
      )}

      <div className="mt-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white py-12 text-slate-600"
        >
          {preview ? "Change photo" : "Choose or take photo"}
        </button>
      </div>

      {preview && (
        <img src={preview} alt="Preview" className="mt-4 max-h-64 w-full rounded-lg object-contain" />
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
        <textarea
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {err && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
      )}

      <button
        type="button"
        disabled={!file || uploading}
        onClick={submit}
        className="mt-6 w-full rounded-lg bg-emerald-600 py-3 font-medium text-white disabled:opacity-50"
      >
        {uploading ? "Analysing photo…" : "Submit"}
      </button>

      {scan && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Result</p>
          <p className="mt-2 text-slate-600">
            Status: <strong>{scan.inference_status}</strong>
          </p>
          {scan.inference_status === "done" && resultImageUrl && (
            <>
              <p className="mt-2">
                Lesions: <strong>{scan.acne_count}</strong> · {scan.severity_label}
              </p>
              <div className="mt-4">
                <DetectionOverlay
                  imageUrl={resultImageUrl}
                  predictions={scan.predictions || []}
                />
              </div>
            </>
          )}
          {scan.inference_status === "failed" && (
            <p className="mt-2 text-red-700">{scan.inference_error}</p>
          )}
        </div>
      )}
    </div>
  );
}
