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

function enforceAdvisoryOnly(input) {
  const forbiddenKeys = [
    "oauthToken",
    "gmailAccessToken",
    "sendNow",
    "autoSend",
    "autoReply",
    "triggerOnchain",
    "approveMilestone",
    "releaseFunds"
  ];

  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      throw new Error(`Forbidden field detected: ${key}. Advisory mode rejects this request.`);
    }
  }
}

function makeSubjectOptions(campaignTitle, brandName, budgetBnb) {
  return [
    `${campaignTitle}: paid collaboration invitation from ${brandName}`,
    `Partnership request: ${campaignTitle} (${budgetBnb} BNB budget)`,
    `Clawgency campaign brief - ${campaignTitle}`
  ];
}

function makeDraftId(brandEmail, influencerEmail, campaignTitle, budgetBnb) {
  const raw = `${brandEmail}|${influencerEmail}|${campaignTitle}|${budgetBnb}`;
  return `draft_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12)}`;
}

function main() {
  const input = parseInput(process.argv[2]);
  enforceAdvisoryOnly(input);

  const brandName = nonEmpty(input.brandName, "brandName");
  const brandEmail = validEmail(input.brandEmail, "brandEmail");
  const influencerName = (typeof input.influencerName === "string" && input.influencerName.trim()) || "there";
  const influencerEmail = validEmail(input.influencerEmail, "influencerEmail");
  const campaignTitle = nonEmpty(input.campaignTitle, "campaignTitle");
  const campaignDetails = nonEmpty(input.campaignDetails, "campaignDetails");
  const budgetBNB = nonEmpty(input.budgetBNB, "budgetBNB");
  const ctaUrl = nonEmpty(input.ctaUrl, "ctaUrl");
  const humanReviewerId =
    (typeof input.humanReviewerId === "string" && input.humanReviewerId.trim()) || "human_reviewer_required";

  const subjectOptions = makeSubjectOptions(campaignTitle, brandName, budgetBNB);
  const recommendedSubject = subjectOptions[0];
  const ctaLabel = "Review campaign brief";
  const draftId = makeDraftId(brandEmail, influencerEmail, campaignTitle, budgetBNB);

  const bodyText = [
    `Hi ${influencerName},`,
    "",
    `I am reaching out from ${brandName} via Clawgency.`,
    `We would like to invite you to a paid collaboration: ${campaignTitle}.`,
    "",
    "Campaign details:",
    campaignDetails,
    "",
    `Budget: ${budgetBNB} BNB`,
    "",
    `If this is interesting, please review here: ${ctaUrl}`,
    "",
    "Please reply with:",
    "- Interested",
    "- Not interested",
    "- Need clarification",
    "",
    "Best regards,",
    `${brandName}`,
    `Contact: ${brandEmail}`
  ].join("\n");

  const bodyHtml =
    `<p>Hi ${influencerName},</p>` +
    `<p>I am reaching out from <strong>${brandName}</strong> via Clawgency.</p>` +
    `<p>We would like to invite you to a paid collaboration: <strong>${campaignTitle}</strong>.</p>` +
    `<p><strong>Campaign details:</strong><br/>${campaignDetails.replace(/\n/g, "<br/>")}</p>` +
    `<p><strong>Budget:</strong> ${budgetBNB} BNB</p>` +
    `<p><a href="${ctaUrl}">${ctaLabel}</a></p>` +
    `<p>Please reply with: Interested / Not interested / Need clarification.</p>` +
    `<p>Best regards,<br/>${brandName}<br/>Contact: ${brandEmail}</p>`;

  const output = {
    schemaVersion: "1.0.0",
    mode: "advisory",
    draftId,
    subjectOptions,
    recommendedSubject,
    cta: {
      label: ctaLabel,
      url: ctaUrl
    },
    bodyText,
    bodyHtml,
    structuredCampaign: {
      brandName,
      influencerName,
      influencerEmail,
      campaignTitle,
      campaignDetails,
      budgetBNB
    },
    reasoning: [
      "Generated deterministic subject options and a professional outreach body.",
      "Included explicit response options to simplify structured intent parsing.",
      "Set advisory safety flags to ensure human approval before any send action."
    ],
    safety: {
      requiresHumanApproval: true,
      platformManagedEmailOnly: true,
      noAutoSend: true
    }
  };

  writeAuditLog({
    workflow: "workflow4-email-drafting",
    userId: humanReviewerId,
    chainEventHash: "N/A",
    recommendation: `Prepared email draft ${draftId} for ${influencerEmail}.`
  });

  console.log(JSON.stringify(output, null, 2));
}

main();
