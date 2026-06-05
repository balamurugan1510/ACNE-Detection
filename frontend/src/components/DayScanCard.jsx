import DetectionOverlay from "./DetectionOverlay";
import { getApiOrigin } from "../api/client";

export default function DayScanCard({ scan }) {
  const base = getApiOrigin();
  const src = scan.image_url ? `${base}${scan.image_url}` : null;
  const preds = scan.predictions || [];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-slate-100">
        {src ? (
          <div className="flex h-full w-full items-center justify-center p-1">
            <DetectionOverlay imageUrl={src} predictions={preds} className="max-h-full" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No image
          </div>
        )}
        <span className="absolute left-2 top-2 z-10 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
          Day {scan.day_number}
        </span>
        <span className="absolute bottom-2 right-2 z-10 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
          {scan.acne_count} lesions
        </span>
      </div>
      <div className="p-2 text-center text-xs text-slate-600">
        {scan.severity_label || "—"}
      </div>
    </div>
  );
}
