#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { writeAuditLog } = require("./_shared");

const CID_PATTERN = /^ipfs:\/\/[a-zA-Z0-9]{20,}$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function parseInput(arg) {
  if (!arg) {
    throw new Error("Provide JSON input string or file path.");
  }
  const candidatePath = path.resolve(process.cwd(), arg);
  const raw = fs.existsSync(candidatePath) ? fs.readFileSync(candidatePath, "utf8") : arg;
  return JSON.parse(raw);
}

function validateProofFormat(proof) {
  if (CID_PATTERN.test(proof)) {
    return { valid: true, type: "ipfs" };
  }
  if (URL_PATTERN.test(proof)) {
    return { valid: true, type: "url" };
  }
  return { valid: false, type: "unknown" };
}

function main() {
  const input = parseInput(process.argv[2]);
  const campaignId = Number(input.campaignId);
  const proof = String(input.proofHash ?? input.url ?? "");

  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw new Error("campaignId must be a positive integer.");
  }

  const format = validateProofFormat(proof);
  const hasSuspiciousTerm = /dropbox|drive\.google|bit\.ly|tinyurl/i.test(proof);
  const valid = format.valid && !hasSuspiciousTerm;

  const reasoning = valid
    ? `Proof format accepted (${format.type}). Link pattern appears stable and non-shortened.`
    : `Proof rejected. ${format.valid ? "Short-link hosts require manual re-upload to immutable storage." : "Proof must be ipfs://CID or direct https:// URL."}`;

  const suggestion = valid ? "approve" : "reject";
  const humanReviewComment = valid
    ? "Proof syntax looks valid. Human reviewer should verify content matches the deliverable."
    : "Request revision: submit immutable IPFS proof or trusted direct URL with deliverable evidence.";

  const output = {
    valid,
    reasoning,
    suggestion,
    humanReviewComment
  };

  writeAuditLog({
    workflow: "workflow2-proof-validation",
    userId: input.userId ?? "unknown_user",
    chainEventHash: input.chainEventHash ?? "N/A",
    recommendation: `${suggestion.toUpperCase()} proof for campaign ${campaignId}`,
    campaignId
  });

  console.log(JSON.stringify(output, null, 2));
}

main();
