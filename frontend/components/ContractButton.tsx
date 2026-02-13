"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/ConfirmModal";

/* ── Color presets ── */
const colorMap = {
  default: {
    bg: "rgba(0,0,0,0.03)",
    hoverBg: "rgba(0,0,0,0.06)",
    text: "#374151",
    border: "rgba(0,0,0,0.08)",
  },
  primary: {
    bg: "rgba(99,102,241,0.1)",
    hoverBg: "rgba(99,102,241,0.15)",
    text: "#6366f1",
    border: "rgba(99,102,241,0.2)",
  },
  secondary: {
    bg: "rgba(139,92,246,0.1)",
    hoverBg: "rgba(139,92,246,0.15)",
    text: "#8b5cf6",
    border: "rgba(139,92,246,0.2)",
  },
  success: {
    bg: "linear-gradient(135deg, #10b981, #059669)",
    hoverBg: "linear-gradient(135deg, #059669, #047857)",
    text: "#ffffff",
    border: "rgba(16,185,129,0.3)",
  },
  warning: {
    bg: "rgba(245,158,11,0.1)",
    hoverBg: "rgba(245,158,11,0.15)",
    text: "#f59e0b",
    border: "rgba(245,158,11,0.2)",
  },
  danger: {
    bg: "rgba(239,68,68,0.1)",
    hoverBg: "rgba(239,68,68,0.15)",
    text: "#ef4444",
    border: "rgba(239,68,68,0.2)",
  },
} as const;

const sizeMap = {
  sm: "px-3.5 py-2 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-sm gap-2",
} as const;

type ContractButtonProps = {
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  onExecute: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
};

export function ContractButton({
  label,
  confirmTitle,
  confirmMessage,
  onExecute,
  disabled = false,
  className = "",
  color = "default",
  size = "sm",
}: ContractButtonProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const palette = colorMap[color] || colorMap.default;
  const sizeClass = sizeMap[size] || sizeMap.sm;
  const isGradient = palette.bg.startsWith("linear");

  async function execute() {
    setOpen(false);
    setRunning(true);
    try {
      await onExecute();
      toast.success(`${label} succeeded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown transaction failure";
      toast.error(`${label} failed: ${message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        disabled={disabled || running}
        onClick={() => setOpen(true)}
        className={`
          inline-flex items-center justify-center ${sizeClass} rounded-xl
          font-body font-bold transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm
          ${className}
        `}
        style={{
          background: isGradient ? palette.bg : palette.bg,
          color: palette.text,
          border: `1.5px solid ${palette.border}`,
          ...(isGradient && color === "success"
            ? { boxShadow: "0 4px 14px rgba(16,185,129,0.25)" }
            : {}),
        }}
      >
        {running ? (
          <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" />
        ) : null}
        {label}
      </button>

      <ConfirmModal
        open={open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={label}
        onConfirm={() => void execute()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
