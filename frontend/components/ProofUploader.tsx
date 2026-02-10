"use client";

import { useState } from "react";
import type { Workflow2Response } from "@/types/agent";

type ProofUploaderProps = {
  disabled?: boolean;
  onSubmit: (proofHash: string) => Promise<void>;
  onValidate?: (proofHash: string) => Promise<Workflow2Response>;
};

export function ProofUploader({ disabled = false, onSubmit, onValidate }: ProofUploaderProps) {
  const [proofHash, setProofHash] = useState("");
  const [running, setRunning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<Workflow2Response | null>(null);

  const trimmedProof = proofHash.trim();
  const proofFormatValid =
    trimmedProof.length > 0 && (trimmedProof.startsWith("ipfs://") || trimmedProof.startsWith("https://"));

  async function submit() {
    if (!trimmedProof) {
      return;
    }
    if (!proofFormatValid) {
      return;
    }
    setRunning(true);
    try {
      await onSubmit(trimmedProof);
      setProofHash("");
      setValidation(null);
    } finally {
      setRunning(false);
    }
  }

  async function validate() {
    if (!onValidate || !trimmedProof || !proofFormatValid) {
      return;
    }
    setValidating(true);
    try {
      const result = await onValidate(trimmedProof);
      setValidation(result);
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="w-full section-card p-3">
      <label className="block text-xs font-semibold text-ink">Proof Hash / URL</label>
      <input
        value={proofHash}
        onChange={(event) => setProofHash(event.target.value)}
        placeholder="ipfs://... or https://..."
        className="input-field mt-2"
      />
      <p className="mt-1 text-[11px] text-steel">
        Use a stable proof link format: `ipfs://...` or `https://...`.
      </p>
      {trimmedProof.length > 0 && !proofFormatValid && (
        <p className="mt-1 text-[11px] text-red-700">Proof must start with `ipfs://` or `https://`.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={disabled || validating || !trimmedProof || !proofFormatValid || !onValidate}
          onClick={() => void validate()}
        >
          {validating ? "Validating..." : "Validate With AI"}
        </button>
        <button
          className="btn-primary px-3 py-1.5 text-xs"
          disabled={disabled || running || !trimmedProof || !proofFormatValid}
          onClick={() => void submit()}
        >
          {running ? "Submitting..." : "Submit Proof"}
        </button>
      </div>

      {validation && (
        <div
          className={`mt-3 rounded-lg border p-2.5 text-xs leading-relaxed ${
            validation.suggestion === "approve"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-medium">AI Suggestion: {validation.suggestion.toUpperCase()}</p>
          <p>{validation.reasoning}</p>
          <p className="mt-1">{validation.humanReviewComment}</p>
        </div>
      )}
    </div>
  );
}
