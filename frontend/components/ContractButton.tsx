"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/ConfirmModal";

type ContractButtonProps = {
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  onExecute: () => Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function ContractButton({
  label,
  confirmTitle,
  confirmMessage,
  onExecute,
  disabled = false,
  className = "btn-primary px-3 py-1.5 text-xs"
}: ContractButtonProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

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
      <button className={className} disabled={disabled || running} onClick={() => setOpen(true)}>
        {running ? "Submitting..." : label}
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
