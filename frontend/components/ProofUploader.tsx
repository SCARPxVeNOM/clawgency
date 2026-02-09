"use client";

import { useState } from "react";

type ProofUploaderProps = {
  disabled?: boolean;
  onSubmit: (proofHash: string) => Promise<void>;
};

export function ProofUploader({ disabled = false, onSubmit }: ProofUploaderProps) {
  const [proofHash, setProofHash] = useState("");
  const [running, setRunning] = useState(false);

  async function submit() {
    if (!proofHash.trim()) {
      return;
    }
    setRunning(true);
    try {
      await onSubmit(proofHash.trim());
      setProofHash("");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-3">
      <label className="block text-xs font-medium text-ink">Proof Hash / URL</label>
      <input
        value={proofHash}
        onChange={(event) => setProofHash(event.target.value)}
        placeholder="ipfs://... or https://..."
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
      />
      <button
        className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        disabled={disabled || running || !proofHash.trim()}
        onClick={() => void submit()}
      >
        {running ? "Submitting..." : "Submit Proof"}
      </button>
    </div>
  );
}
