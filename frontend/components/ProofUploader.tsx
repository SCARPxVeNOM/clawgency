"use client";

import { useState } from "react";
import { Upload, Bot, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
  const hasInput = trimmedProof.length > 0;

  async function submit() {
    if (!trimmedProof || !proofFormatValid) return;
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
    if (!onValidate || !trimmedProof || !proofFormatValid) return;
    setValidating(true);
    try {
      const result = await onValidate(trimmedProof);
      setValidation(result);
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" }}
        >
          <Upload size={16} className="text-indigo-500" strokeWidth={2} />
        </div>
        <div>
          <h4 className="text-sm font-heading font-bold text-gray-900">Submit Proof</h4>
          <p className="text-[10px] font-body text-gray-400">Provide a stable proof link</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-body font-bold uppercase tracking-widest text-gray-400">
          Proof Hash / URL
        </label>
        <div className="relative">
          <input
            className="w-full px-4 py-3 pr-10 rounded-xl bg-white/60 border text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
            style={{ borderColor: hasInput && !proofFormatValid ? "#ef4444" : undefined }}
            placeholder="ipfs://... or https://..."
            value={proofHash}
            onChange={(e) => setProofHash(e.target.value)}
          />
          {hasInput && proofFormatValid && (
            <ExternalLink size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
          )}
        </div>
        {hasInput && !proofFormatValid && (
          <p className="text-[10px] font-body text-red-500 flex items-center gap-1">
            <AlertCircle size={10} /> Must start with ipfs:// or https://
          </p>
        )}
        {!hasInput && (
          <p className="text-[10px] font-body text-gray-400">Use a stable proof link: ipfs://â€¦ or https://â€¦</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2.5">
        {onValidate && (
          <button
            onClick={() => void validate()}
            disabled={disabled || !trimmedProof || !proofFormatValid || validating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-body font-bold transition-all disabled:opacity-40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.06))",
              color: "#7c3aed",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            {validating ? (
              <><Loader2 size={13} className="animate-spin" /> Validatingâ€¦</>
            ) : (
              <><Bot size={13} /> Validate With AI</>
            )}
          </button>
        )}
        <button
          onClick={() => void submit()}
          disabled={disabled || !trimmedProof || !proofFormatValid || running}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-body font-bold text-white transition-all disabled:opacity-40 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {running ? (
            <><Loader2 size={13} className="animate-spin" /> Submittingâ€¦</>
          ) : (
            <><Upload size={13} /> Submit Proof</>
          )}
        </button>
      </div>

      {/* AI Validation Result */}
      {validation && (
        <div
          className="rounded-xl p-4 space-y-2 ring-1 ring-inset"
          style={{
            background: validation.suggestion === "approve"
              ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))"
              : "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))"
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: validation.suggestion === "approve" ? "#10b981" : "#f59e0b",
              }}
            >
              <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span
              className="text-xs font-body font-bold"
              style={{ color: validation.suggestion === "approve" ? "#047857" : "#b45309" }}
            >
              AI: {validation.suggestion.toUpperCase()}
            </span>
          </div>
          <p
            className="text-xs font-body leading-relaxed pl-8"
            style={{ color: validation.suggestion === "approve" ? "#065f46" : "#92400e" }}
          >
            {validation.reasoning}
          </p>
          {validation.humanReviewComment && (
            <p className="text-[10px] font-body text-gray-500 pl-8 italic">
              {validation.humanReviewComment}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

