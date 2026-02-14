import crypto from "node:crypto";
import { appendAgentAuditLog } from "@/lib/server/agent-audit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CompletionDraftInput = {
  campaignId: number;
  milestoneNumber: number;
  brandName: string;
  brandEmail: string;
  influencerName: string;
  influencerEmail: string;
  proofHash: string;
  campaignTitle: string;
};

export type CompletionDraftOutput = {
  schemaVersion: "1.0.0";
  mode: "advisory";
  draftId: string;
  subjectOptions: string[];
  recommendedSubject: string;
  bodyText: string;
  bodyHtml: string;
  reasoning: string[];
  safety: {
    requiresHumanApproval: true;
    platformManagedEmailOnly: true;
    noAutoSend: true;
  };
};

function nonEmpty(value: string | undefined, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function validEmail(value: string | undefined, fieldName: string): string {
  const email = nonEmpty(value, fieldName);
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(`${fieldName} must be a valid email.`);
  }
  return email.toLowerCase();
}

function toPositiveInteger(value: number, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function normalizeProofUrl(value: string): string {
  const proof = nonEmpty(value, "proofHash");
  if (proof.startsWith("https://") || proof.startsWith("ipfs://")) {
    return proof;
  }
  return `proof:${proof}`;
}

function makeDraftId(
  campaignId: number,
  milestoneNumber: number,
  influencerEmail: string,
  brandEmail: string,
  proofHash: string
): string {
  const raw = `${campaignId}|${milestoneNumber}|${influencerEmail}|${brandEmail}|${proofHash}`;
  return `draft_completion_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12)}`;
}

export async function runEmailCompletionDraftWorkflow(input: CompletionDraftInput): Promise<CompletionDraftOutput> {
  const campaignId = toPositiveInteger(input.campaignId, "campaignId");
  const milestoneNumber = toPositiveInteger(input.milestoneNumber, "milestoneNumber");

  const brandName = nonEmpty(input.brandName, "brandName");
  const brandEmail = validEmail(input.brandEmail, "brandEmail");
  const influencerName = nonEmpty(input.influencerName, "influencerName");
  const influencerEmail = validEmail(input.influencerEmail, "influencerEmail");
  const proofHash = normalizeProofUrl(input.proofHash);
  const campaignTitle = nonEmpty(input.campaignTitle, "campaignTitle");

  const draftId = makeDraftId(campaignId, milestoneNumber, influencerEmail, brandEmail, proofHash);
  const subjectOptions = [
    `${influencerName} submitted proof for Campaign #${campaignId} (M${milestoneNumber})`,
    `Milestone update: Campaign #${campaignId} now ready for review`,
    `Action required: review creator proof for ${campaignTitle}`
  ];

  const bodyText = [
    `Hi ${brandName},`,
    "",
    `${influencerName} has submitted proof for Campaign #${campaignId}.`,
    `Milestone: M${milestoneNumber}`,
    "",
    `Campaign: ${campaignTitle}`,
    `Proof link/hash: ${proofHash}`,
    "",
    "Next step:",
    "1) Review the submitted proof",
    "2) Approve milestone on-chain",
    "3) Release funds after approval",
    "",
    "Sent via Clawgency platform automation.",
    `Creator contact: ${influencerEmail}`
  ].join("\n");

  const bodyHtml =
    `<p>Hi ${brandName},</p>` +
    `<p><strong>${influencerName}</strong> has submitted proof for <strong>Campaign #${campaignId}</strong>.</p>` +
    `<p><strong>Milestone:</strong> M${milestoneNumber}<br/>` +
    `<strong>Campaign:</strong> ${campaignTitle}<br/>` +
    `<strong>Proof link/hash:</strong> ${proofHash}</p>` +
    `<p><strong>Next step:</strong><br/>1) Review proof<br/>2) Approve on-chain<br/>3) Release funds</p>` +
    `<p>Sent via Clawgency platform automation.<br/>Creator contact: ${influencerEmail}</p>`;

  const output: CompletionDraftOutput = {
    schemaVersion: "1.0.0",
    mode: "advisory",
    draftId,
    subjectOptions,
    recommendedSubject: subjectOptions[0],
    bodyText,
    bodyHtml,
    reasoning: [
      "Prepared a concise milestone-proof notification for the brand.",
      "Included explicit review and release steps to reduce operational ambiguity.",
      "Marked output as advisory and platform-managed email only."
    ],
    safety: {
      requiresHumanApproval: true,
      platformManagedEmailOnly: true,
      noAutoSend: true
    }
  };

  await appendAgentAuditLog({
    timestamp: new Date().toISOString(),
    workflow: "workflow6-completion-email-drafting",
    userId: influencerEmail,
    chainEventHash: `campaign_${campaignId}_m${milestoneNumber}`,
    recommendation: `Prepared completion draft ${draftId} for brand ${brandEmail}.`
  });

  return output;
}

