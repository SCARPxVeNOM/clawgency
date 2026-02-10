#!/usr/bin/env node
"use strict";

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

function safeEmail(value) {
  if (typeof value !== "string") {
    return "unknown@unknown";
  }
  const email = value.trim().toLowerCase();
  return EMAIL_REGEX.test(email) ? email : "unknown@unknown";
}

function enforceAdvisoryOnly(input) {
  const forbiddenKeys = ["oauthToken", "gmailAccessToken", "autoReply", "sendEmail", "triggerOnchain"];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      throw new Error(`Forbidden field detected: ${key}. Advisory mode rejects this request.`);
    }
  }
}

function extractQuestions(text) {
  const matches = text.match(/[^?]+\?/g) || [];
  const unique = [];
  for (const raw of matches) {
    const normalized = raw.replace(/\s+/g, " ").trim();
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized);
    }
    if (unique.length >= 5) {
      break;
    }
  }
  return unique;
}

function classifyInterest(replyTextLower) {
  const yesMarkers = ["interested", "sounds good", "count me in", "let us proceed", "yes", "happy to"];
  const noMarkers = ["not interested", "decline", "no thanks", "pass", "cannot commit", "not available"];
  const maybeMarkers = ["maybe", "need more", "clarify", "question", "depends", "share details"];

  const yesHits = yesMarkers.filter((m) => replyTextLower.includes(m)).length;
  const noHits = noMarkers.filter((m) => replyTextLower.includes(m)).length;
  const maybeHits = maybeMarkers.filter((m) => replyTextLower.includes(m)).length;

  if (yesHits > 0 && noHits === 0 && maybeHits === 0) {
    return { interest: "yes", confidence: 0.88, reasoning: "Positive intent markers found without conflicting signals." };
  }
  if (noHits > 0 && yesHits === 0) {
    return { interest: "no", confidence: 0.9, reasoning: "Explicit decline markers found in reply." };
  }
  if (yesHits > 0 && maybeHits > 0) {
    return { interest: "maybe", confidence: 0.67, reasoning: "Interest markers present with clarification requests." };
  }
  if (maybeHits > 0 || replyTextLower.includes("?")) {
    return { interest: "maybe", confidence: 0.72, reasoning: "Reply asks for more details before commitment." };
  }
  return { interest: "maybe", confidence: 0.55, reasoning: "No clear accept/decline markers found." };
}

function main() {
  const input = parseInput(process.argv[2]);
  enforceAdvisoryOnly(input);

  const replyText = nonEmpty(input.replyText, "replyText");
  const replyTextLower = replyText.toLowerCase();
  const fromEmail = safeEmail(input.fromEmail);
  const questions = extractQuestions(replyText);
  const classification = classifyInterest(replyTextLower);

  const output = {
    schemaVersion: "1.0.0",
    mode: "advisory",
    interest: classification.interest,
    questions,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    requiresHumanReview: true
  };

  writeAuditLog({
    workflow: "workflow5-reply-parsing",
    userId: fromEmail,
    chainEventHash: input.threadId || input.messageId || "N/A",
    recommendation: `Classified reply as ${output.interest.toUpperCase()} with confidence ${output.confidence.toFixed(2)}.`
  });

  console.log(JSON.stringify(output, null, 2));
}

main();
