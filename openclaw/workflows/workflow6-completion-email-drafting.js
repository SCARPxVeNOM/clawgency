#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { writeAuditLog } = require("./_shared");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseInput(rawArg) {
  if (!rawArg) {
    throw new Error("Input JSON string is required.");
  }

  try {
    return JSON.parse(rawArg);
  } catch {
    const candidatePath = path.resolve(process.cwd(), rawArg);
    const allowRoot = path.resolve(process.cwd(), "openclaw", "workflows");
    const normalizedRoot = allowRoot.toLowerCase();
    const normalizedCandidate = candidatePath.toLowerCase();

    if (!(normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`))) {
      throw new Error("File input path is not allowed.");
    }
    if (!fs.existsSync(candidatePath)) {
      throw new Error("Input JSON file not found.");
    }

    return JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  }
}

function nonEmpty(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function validEmail(value, fieldName) {
  const email = nonEmpty(value, fieldName);
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(`${fieldName} must be a valid email.`);
  }
  return email.toLowerCase();
}

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function normalizeProofUrl(value) {
  const proof = nonEmpty(value, "proofHash");
  if (proof.startsWith("https://") || proof.startsWith("ipfs://")) {
    return proof;
  }
  return `proof:${proof}`;
}

function makeDraftId(campaignId, milestoneNumber, influencerEmail, brandEmail, proofHash) {
  const raw = `${campaignId}|${milestoneNumber}|${influencerEmail}|${brandEmail}|${proofHash}`;
  return `draft_completion_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12)}`;
}

function main() {
  const input = parseInput(process.argv[2]);

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

  const output = {
    schemaVersion: "1.0.0",
    mode: "advisory",
    draftId,
    subjectOptions,
    recommendedSubject: subjectOptions[0],
    bodyText,
    bodyHtml,
    structuredCampaign: {
      campaignId,
      campaignTitle,
      milestoneNumber,
      brandName,
      brandEmail,
      influencerName,
      influencerEmail,
      proofHash
    },
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

  writeAuditLog({
    workflow: "workflow6-completion-email-drafting",
    userId: influencerEmail,
    chainEventHash: `campaign_${campaignId}_m${milestoneNumber}`,
    recommendation: `Prepared completion draft ${draftId} for brand ${brandEmail}.`
  });

  console.log(JSON.stringify(output, null, 2));
}

main();
