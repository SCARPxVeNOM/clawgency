import { NextResponse } from "next/server";
import { sendPlatformEmail } from "@/lib/server/email";
import { appendHumanApprovalLog, assertHumanApprovalLoggingReady } from "@/lib/server/human-approval";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPROVAL_SESSION_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;

type SendEmailRequest = {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
  humanApprovedBy: string;
  humanApprovalConfirmed: boolean;
  approvalSessionId: string;
  campaignId?: string;
  draftId?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRequestBody(body: unknown): { ok: true; value: SendEmailRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const candidate = body as Partial<SendEmailRequest>;
  if (!isNonEmptyString(candidate.to) || !EMAIL_REGEX.test(candidate.to.trim())) {
    return { ok: false, error: "to must be a valid email." };
  }
  if (!isNonEmptyString(candidate.subject)) {
    return { ok: false, error: "subject is required." };
  }
  if (!isNonEmptyString(candidate.bodyText)) {
    return { ok: false, error: "bodyText is required." };
  }
  if (!isNonEmptyString(candidate.humanApprovedBy)) {
    return { ok: false, error: "humanApprovedBy is required for human-in-the-loop safety." };
  }
  if (candidate.humanApprovalConfirmed !== true) {
    return { ok: false, error: "humanApprovalConfirmed must be true before send." };
  }
  if (!isNonEmptyString(candidate.approvalSessionId) || !APPROVAL_SESSION_REGEX.test(candidate.approvalSessionId.trim())) {
    return {
      ok: false,
      error: "approvalSessionId is required (8-80 chars, letters/numbers/_/-)."
    };
  }
  if (candidate.campaignId !== undefined && (typeof candidate.campaignId !== "string" || !candidate.campaignId.trim())) {
    return { ok: false, error: "campaignId must be a non-empty string if provided." };
  }
  if (candidate.draftId !== undefined && (typeof candidate.draftId !== "string" || !candidate.draftId.trim())) {
    return { ok: false, error: "draftId must be a non-empty string if provided." };
  }

  return {
    ok: true,
    value: {
      to: candidate.to.trim().toLowerCase(),
      subject: candidate.subject.trim(),
      bodyText: candidate.bodyText.trim(),
      bodyHtml: candidate.bodyHtml?.trim() || undefined,
      threadId: candidate.threadId?.trim() || undefined,
      humanApprovedBy: candidate.humanApprovedBy.trim(),
      humanApprovalConfirmed: true,
      approvalSessionId: candidate.approvalSessionId.trim(),
      campaignId: candidate.campaignId?.trim() || undefined,
      draftId: candidate.draftId?.trim() || undefined
    }
  };
}

export async function POST(request: Request) {
  const rateLimitPerMin = Number(process.env.EMAIL_SEND_RATE_LIMIT_PER_MIN ?? "20");
  const rate = checkRateLimit({
    request,
    scope: "api_email_send",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for email send. Retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec)
        }
      }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateRequestBody(rawBody);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  assertHumanApprovalLoggingReady();

  const approvalBase = {
    timestamp: new Date().toISOString(),
    category: "email_send" as const,
    approvalSessionId: validation.value.approvalSessionId,
    humanApprovedBy: validation.value.humanApprovedBy,
    approvalConfirmed: true as const,
    campaignId: validation.value.campaignId ?? null,
    draftId: validation.value.draftId ?? null,
    to: validation.value.to,
    subject: validation.value.subject,
    threadId: validation.value.threadId ?? null
  };

  try {
    // Moltbot does not send emails. Backend sends from platform-managed Gmail only.
    const sent = await sendPlatformEmail({
      to: validation.value.to,
      subject: validation.value.subject,
      bodyText: validation.value.bodyText,
      bodyHtml: validation.value.bodyHtml,
      threadId: validation.value.threadId
    });

    try {
      await appendHumanApprovalLog({
        ...approvalBase,
        messageId: sent.messageId,
        providerMode: sent.mode,
        outcome: "sent",
        error: null
      });
    } catch {
      // Avoid failing a successful send if audit write fails.
    }

    return NextResponse.json({
      sent,
      approval: {
        approvalSessionId: validation.value.approvalSessionId,
        approvedBy: validation.value.humanApprovedBy,
        confirmed: true,
        campaignId: validation.value.campaignId ?? null,
        draftId: validation.value.draftId ?? null
      },
      policy: {
        explicitHumanApprovalGate: true,
        sentByBackendOnly: true,
        platformManagedAccountOnly: true,
        approvedBy: validation.value.humanApprovedBy
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    try {
      await appendHumanApprovalLog({
        ...approvalBase,
        messageId: null,
        providerMode: "unknown",
        outcome: "failed",
        error: message
      });
    } catch {
      // Keep API failure reason focused on send error.
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
