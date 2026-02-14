import type { Workflow2Request, Workflow2Response } from "@/types/agent";
import { appendAgentAuditLog } from "@/lib/server/agent-audit";

const CID_PATTERN = /^ipfs:\/\/[a-zA-Z0-9]{20,}$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function validateProofFormat(proof: string): { valid: boolean; type: "ipfs" | "url" | "unknown" } {
  if (CID_PATTERN.test(proof)) {
    return { valid: true, type: "ipfs" };
  }
  if (URL_PATTERN.test(proof)) {
    return { valid: true, type: "url" };
  }
  return { valid: false, type: "unknown" };
}

export async function runWorkflow2(input: Workflow2Request): Promise<Workflow2Response> {
  const campaignId = Number(input.campaignId);
  const proof = String((input as { proofHash?: unknown; url?: unknown }).proofHash ?? (input as { url?: unknown }).url ?? "");

  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw new Error("campaignId must be a positive integer.");
  }

  const format = validateProofFormat(proof);
  const hasSuspiciousTerm = /dropbox|drive\.google|bit\.ly|tinyurl/i.test(proof);
  const valid = format.valid && !hasSuspiciousTerm;

  const reasoning = valid
    ? `Proof format accepted (${format.type}). Link pattern appears stable and non-shortened.`
    : `Proof rejected. ${
        format.valid
          ? "Short-link hosts require manual re-upload to immutable storage."
          : "Proof must be ipfs://CID or direct https:// URL."
      }`;

  const suggestion: Workflow2Response["suggestion"] = valid ? "approve" : "reject";
  const humanReviewComment = valid
    ? "Proof syntax looks valid. Human reviewer should verify content matches the deliverable."
    : "Request revision: submit immutable IPFS proof or trusted direct URL with deliverable evidence.";

  const output: Workflow2Response = {
    valid,
    reasoning,
    suggestion,
    humanReviewComment
  };

  await appendAgentAuditLog({
    timestamp: new Date().toISOString(),
    workflow: "workflow2-proof-validation",
    userId: input.userId ?? "unknown_user",
    chainEventHash: input.chainEventHash ?? "N/A",
    recommendation: `${suggestion.toUpperCase()} proof for campaign ${campaignId}`,
    campaignId
  });

  return output;
}

