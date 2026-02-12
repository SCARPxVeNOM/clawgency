"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Button } from "@heroui/react";

type ContractButtonProps = {
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  onExecute: () => Promise<void>;
  disabled?: boolean;
  className?: string; // allow overrides, but we won't really use it for styling anymore if we use Button
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
  variant = "solid",
  color = "default",
  size = "sm"
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
      <Button
        className={className}
        isDisabled={disabled || running}
        onPress={() => setOpen(true)}
        isLoading={running}
        variant={variant}
        color={color}
        size={size}
      >
        {label}
      </Button>
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
