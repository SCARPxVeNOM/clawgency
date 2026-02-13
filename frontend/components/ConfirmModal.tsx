"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 transition-colors"
        >
          <X size={16} strokeWidth={2} />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" }}
          >
            <AlertTriangle size={18} className="text-indigo-500" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-heading font-bold text-gray-900">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm font-body text-gray-500 leading-relaxed pl-[52px]">{message}</p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-sm font-body font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
