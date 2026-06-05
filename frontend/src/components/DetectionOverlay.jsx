import { useState } from "react";

/**
 * Draws bounding boxes from Roboflow-style predictions on top of the image.
 */
function rectPercent(pred, nw, nh) {
  if (!nw || !nh) return null;
  let left;
  let top;
  let w;
  let h;
  if (
    pred.x_min != null &&
    pred.y_min != null &&
    pred.x_max != null &&
    pred.y_max != null
  ) {
    left = (Number(pred.x_min) / nw) * 100;
    top = (Number(pred.y_min) / nh) * 100;
    w = ((Number(pred.x_max) - Number(pred.x_min)) / nw) * 100;
    h = ((Number(pred.y_max) - Number(pred.y_min)) / nh) * 100;
  } else if (pred.x != null && pred.y != null && pred.width != null && pred.height != null) {
    const cx = Number(pred.x);
    const cy = Number(pred.y);
    const bw = Number(pred.width);
    const bh = Number(pred.height);
    left = ((cx - bw / 2) / nw) * 100;
    top = ((cy - bh / 2) / nh) * 100;
    w = (bw / nw) * 100;
    h = (bh / nh) * 100;
  } else {
    return null;
  }
  if ([left, top, w, h].some((x) => Number.isNaN(x))) return null;
  return { left, top, w, h };
}

export default function DetectionOverlay({ imageUrl, predictions = [], className = "" }) {
  const preds = Array.isArray(predictions) ? predictions : [];
  const [size, setSize] = useState({ nw: 1, nh: 1 });

  return (
    <div className={`relative inline-block max-w-full ${className}`}>
      <img
        src={imageUrl}
        alt=""
        className="block max-h-64 w-full object-contain"
        onLoad={(e) => {
          setSize({ nw: e.target.naturalWidth, nh: e.target.naturalHeight });
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        {preds.map((p, i) => {
          const r = rectPercent(p, size.nw, size.nh);
          if (!r) return null;
          const conf =
            p.confidence != null ? Number(p.confidence).toFixed(2) : "";
          return (
            <div
              key={i}
              className="absolute border-2 border-orange-500 bg-orange-500/10"
              style={{
                left: `${r.left}%`,
                top: `${r.top}%`,
                width: `${r.w}%`,
                height: `${r.h}%`,
              }}
            >
              {conf ? (
                <span className="absolute left-0 top-0 bg-black/60 px-0.5 text-[10px] text-white">
                  {conf}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
