import { useState } from "react";

export default function NotificationBanner({ message, onDismiss }) {
  const [open, setOpen] = useState(true);
  if (!open || !message) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <span className="text-sm">{message}</span>
      <button
        type="button"
        className="text-sm font-medium text-amber-800 underline"
        onClick={() => {
          setOpen(false);
          onDismiss?.();
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
