import type { EmailReplyParseRequest, EmailReplyParseResponse } from "@/types/agent";
import { appendAgentAuditLog } from "@/lib/server/agent-audit";
import { runWithOpenClawFallback } from "@/lib/server/workflows/openclaw-runner";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nonEmpty(value: string | undefined, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function safeEmail(value: string | undefined): string {
  if (typeof value !== "string") {
    return "unknown@unknown";
  }
  const email = value.trim().toLowerCase();
  return EMAIL_REGEX.test(email) ? email : "unknown@unknown";
}

function extractQuestions(text: string): string[] {
  const matches = text.match(/[^?]+\?/g) || [];
  const unique: string[] = [];
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

function classifyInterest(
  replyTextLower: string
): { interest: EmailReplyParseResponse["interest"]; confidence: number; reasoning: string } {
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

async function runEmailReplyParseWorkflowLocal(input: EmailReplyParseRequest): Promise<EmailReplyParseResponse> {
  const replyText = nonEmpty(input.replyText, "replyText");
  const replyTextLower = replyText.toLowerCase();
  const fromEmail = safeEmail(input.fromEmail);
  const questions = extractQuestions(replyText);
  const classification = classifyInterest(replyTextLower);

  const output: EmailReplyParseResponse = {
    schemaVersion: "1.0.0",
    mode: "advisory",
    interest: classification.interest,
    questions,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    requiresHumanReview: true
  };

  await appendAgentAuditLog({
    timestamp: new Date().toISOString(),
    workflow: "workflow5-reply-parsing",
    userId: fromEmail,
    chainEventHash: input.threadId || input.messageId || "N/A",
    recommendation: `Classified reply as ${output.interest.toUpperCase()} with confidence ${output.confidence.toFixed(2)}.`
  });

  return output;
}

export async function runEmailReplyParseWorkflow(input: EmailReplyParseRequest): Promise<EmailReplyParseResponse> {
  return runWithOpenClawFallback({
    workflow: "emailReplyParse",
    input,
    timeoutMs: 12_000,
    fallback: () => runEmailReplyParseWorkflowLocal(input)
  });
}
