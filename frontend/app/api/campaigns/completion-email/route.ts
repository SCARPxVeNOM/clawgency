import { NextResponse } from "next/server";
import { fetchProfilesByWallets } from "@/lib/server/profiles-store";
import { runEmailCompletionDraftWorkflow } from "@/lib/server/workflows/email-completion-draft";
import { appendHumanApprovalLog, assertHumanApprovalLoggingReady } from "@/lib/server/human-approval";
import { sendPlatformEmail } from "@/lib/server/email";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

export const runtime = "nodejs";

type CompletionEmailRequest = {
  campaignId?: unknown;
  brandWallet?: unknown;
  influencerWallet?: unknown;
  proofHash?: unknown;
  milestoneNumber?: unknown;
  campaignTitle?: unknown;
};

type ParsedCompletionEmailRequest = {
  campaignId: string;
  campaignIdNumber: number;
  brandWallet: `0x${string}`;
  influencerWallet: `0x${string}`;
  proofHash: string;
  milestoneNumber: number;
  campaignTitle: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(parsed) || Number(parsed) <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return Number(parsed);
}

function parseBody(body: unknown): ParsedCompletionEmailRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object.");
  }

  const candidate = body as CompletionEmailRequest;

  if (!isNonEmptyString(candidate.campaignId)) {
    throw new Error("campaignId is required.");
  }
  if (!isNonEmptyString(candidate.brandWallet) || !isWalletAddress(candidate.brandWallet)) {
    throw new Error("brandWallet must be a valid wallet address.");
  }
  if (!isNonEmptyString(candidate.influencerWallet) || !isWalletAddress(candidate.influencerWallet)) {
    throw new Error("influencerWallet must be a valid wallet address.");
  }
  if (!isNonEmptyString(candidate.proofHash)) {
    throw new Error("proofHash is required.");
  }

  const campaignIdNumber = parsePositiveInteger(candidate.campaignId, "campaignId");
  const milestoneNumber = parsePositiveInteger(candidate.milestoneNumber ?? 1, "milestoneNumber");

  return {
    campaignId: candidate.campaignId.trim(),
    campaignIdNumber,
    brandWallet: normalizeWalletAddress(candidate.brandWallet),
    influencerWallet: normalizeWalletAddress(candidate.influencerWallet),
    proofHash: candidate.proofHash.trim(),
    milestoneNumber,
    campaignTitle: isNonEmptyString(candidate.campaignTitle)
      ? candidate.campaignTitle.trim()
      : `Campaign #${campaignIdNumber}`
  };
}

function systemApproverId() {
  return (process.env.SYSTEM_EMAIL_APPROVER_ID ?? "system_openclaw_automation").trim();
}

function createApprovalSessionId(campaignId: string) {
  const compactCampaignId = campaignId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `completion_${compactCampaignId}_${Date.now()}`;
}

export async function POST(request: Request) {
  const rateLimitPerMin = Number(process.env.EMAIL_SEND_RATE_LIMIT_PER_MIN ?? "20");
  const rate = checkRateLimit({
    request,
    scope: "api_campaigns_completion_email",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for completion email automation. Retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec)
        }
      }
    );
  }

  let parsedBody: ParsedCompletionEmailRequest;
  try {
    const rawBody = await request.json();
    parsedBody = parseBody(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    assertHumanApprovalLoggingReady();

    const profiles = await fetchProfilesByWallets([parsedBody.brandWallet, parsedBody.influencerWallet]);
    const brandProfile = profiles.find((profile) => profile.walletAddress === parsedBody.brandWallet);
    const influencerProfile = profiles.find((profile) => profile.walletAddress === parsedBody.influencerWallet);

    if (!brandProfile) {
      return NextResponse.json(
        { error: "Brand wallet is not registered. Register profile first to use completion email automation." },
        { status: 400 }
      );
    }

    if (!influencerProfile) {
      return NextResponse.json(
        { error: "Influencer wallet is not registered. Ask creator to complete registration first." },
        { status: 400 }
      );
    }

    const draft = await runEmailCompletionDraftWorkflow({
      campaignId: parsedBody.campaignIdNumber,
      milestoneNumber: parsedBody.milestoneNumber,
      brandName: brandProfile.displayName,
      brandEmail: brandProfile.email,
      influencerName: influencerProfile.displayName,
      influencerEmail: influencerProfile.email,
      campaignTitle: parsedBody.campaignTitle,
      proofHash: parsedBody.proofHash
    });

    const approvalSessionId = createApprovalSessionId(parsedBody.campaignId);

    try {
      const sent = await sendPlatformEmail({
        to: brandProfile.email,
        subject: draft.recommendedSubject,
        bodyText: draft.bodyText,
        bodyHtml: draft.bodyHtml
      });

      await appendHumanApprovalLog({
        timestamp: new Date().toISOString(),
        category: "email_send",
        approvalSessionId,
        humanApprovedBy: systemApproverId(),
        approvalConfirmed: true,
        campaignId: parsedBody.campaignId,
        draftId: draft.draftId,
        to: brandProfile.email,
        subject: draft.recommendedSubject,
        threadId: sent.threadId,
        messageId: sent.messageId,
        providerMode: sent.mode,
        outcome: "sent",
        error: null
      });

      return NextResponse.json({
        sent,
        draft: {
          draftId: draft.draftId,
          recommendedSubject: draft.recommendedSubject,
          reasoning: draft.reasoning
        },
        recipients: {
          brand: brandProfile.email,
          influencer: influencerProfile.email
        },
        approval: {
          approvalSessionId,
          approvedBy: systemApproverId()
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send completion email.";

      try {
        await appendHumanApprovalLog({
          timestamp: new Date().toISOString(),
          category: "email_send",
          approvalSessionId,
          humanApprovedBy: systemApproverId(),
          approvalConfirmed: true,
          campaignId: parsedBody.campaignId,
          draftId: draft.draftId,
          to: brandProfile.email,
          subject: draft.recommendedSubject,
          threadId: null,
          messageId: null,
          providerMode: "unknown",
          outcome: "failed",
          error: message
        });
      } catch {
        // Keep API error focused on send failure.
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process completion email flow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
