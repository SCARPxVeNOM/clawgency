"use client";

import { useState } from "react";
import type { Workflow2Response } from "@/types/agent";
import { Card, CardBody, Input, Button } from "@heroui/react";

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
    <Card className="w-full">
      <CardBody className="p-4 gap-4">
        <div>
          <Input
            label="PROOF HASH / URL"
            labelPlacement="outside"
            placeholder="ipfs://... or https://..."
            value={proofHash}
            onValueChange={setProofHash}
            description="Use a stable proof link: ipfs://... or https://..."
            errorMessage={trimmedProof.length > 0 && !proofFormatValid ? "Proof must start with ipfs:// or https://" : undefined}
            isInvalid={trimmedProof.length > 0 && !proofFormatValid}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            color="secondary"
            variant="flat"
            isLoading={validating}
            isDisabled={disabled || !trimmedProof || !proofFormatValid || !onValidate}
            onPress={() => void validate()}
          >
            {validating ? "Validating..." : "🤖 Validate With AI"}
          </Button>
          <Button
            size="sm"
            color="primary"
            variant="solid" // or shadow
            isLoading={running}
            isDisabled={disabled || !trimmedProof || !proofFormatValid}
            onPress={() => void submit()}
          >
            {running ? "Submitting..." : "📤 Submit Proof"}
          </Button>
        </div>

        {validation && (
          <Card
            className={`p-3 text-xs ${validation.suggestion === "approve"
              ? "bg-success-50 text-success-700 border-success-200"
              : "bg-warning-50 text-warning-700 border-warning-200"
              }`}
            shadow="none"
            radius="sm"
          >
            <p className="font-bold">AI: {validation.suggestion.toUpperCase()}</p>
            <p className="mt-1 font-medium">{validation.reasoning}</p>
            <p className="mt-1 text-default-600 font-medium">{validation.humanReviewComment}</p>
          </Card>
        )}
      </CardBody>
    </Card>
  );
}
