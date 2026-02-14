import { NextResponse } from "next/server";
import { runEmailDraftWorkflow } from "@/lib/server/workflows/email-draft";
import { checkRateLimit } from "@/lib/server/rate-limit";
import type { EmailDraftRequest, EmailDraftResponse } from "@/types/agent";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateEmail(value: unknown, field: string): { ok: true; value: string } | { ok: false; error: string } {
  if (!isNonEmptyString(value) || !EMAIL_REGEX.test(value.trim())) {
    return { ok: false, error: `${field} must be a valid email.` };
  }
  return { ok: true, value: value.trim().toLowerCase() };
}

function validateRequestBody(body: unknown): { ok: true; value: EmailDraftRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const candidate = body as Partial<EmailDraftRequest>;

  if (!isNonEmptyString(candidate.brandName)) {
    return { ok: false, error: "brandName is required." };
  }
  const brandEmail = validateEmail(candidate.brandEmail, "brandEmail");
  if (!brandEmail.ok) {
    return brandEmail;
  }

  if (!isNonEmptyString(candidate.influencerEmail)) {
    return { ok: false, error: "influencerEmail is required." };
  }
  const influencerEmail = validateEmail(candidate.influencerEmail, "influencerEmail");
  if (!influencerEmail.ok) {
    return influencerEmail;
  }

  if (!isNonEmptyString(candidate.campaignTitle)) {
    return { ok: false, error: "campaignTitle is required." };
  }
  if (!isNonEmptyString(candidate.campaignDetails)) {
    return { ok: false, error: "campaignDetails is required." };
  }
  if (!isNonEmptyString(candidate.budgetBNB)) {
    return { ok: false, error: "budgetBNB is required." };
  }
  if (!isNonEmptyString(candidate.ctaUrl) || !URL_REGEX.test(candidate.ctaUrl.trim())) {
    return { ok: false, error: "ctaUrl must be a valid http(s) URL." };
  }

  return {
    ok: true,
    value: {
      brandName: candidate.brandName.trim(),
      brandEmail: brandEmail.value,
      influencerName: candidate.influencerName?.trim() || undefined,
      influencerEmail: influencerEmail.value,
      campaignTitle: candidate.campaignTitle.trim(),
      campaignDetails: candidate.campaignDetails.trim(),
      budgetBNB: candidate.budgetBNB.trim(),
      ctaUrl: candidate.ctaUrl.trim(),
      humanReviewerId: candidate.humanReviewerId?.trim() || undefined
    }
  };
}

function validateResponseBody(body: unknown): body is EmailDraftResponse {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Partial<EmailDraftResponse>;
  if (candidate.schemaVersion !== "1.0.0" || candidate.mode !== "advisory") {
    return false;
  }
  if (!isNonEmptyString(candidate.draftId)) {
    return false;
  }
  if (!Array.isArray(candidate.subjectOptions) || candidate.subjectOptions.length === 0) {
    return false;
  }
  if (!isNonEmptyString(candidate.recommendedSubject)) {
    return false;
  }
  if (!candidate.cta || !isNonEmptyString(candidate.cta.label) || !isNonEmptyString(candidate.cta.url)) {
    return false;
  }
  if (!isNonEmptyString(candidate.bodyText) || !isNonEmptyString(candidate.bodyHtml)) {
    return false;
  }
  if (!candidate.safety) {
    return false;
  }
  if (
    candidate.safety.requiresHumanApproval !== true ||
    candidate.safety.platformManagedEmailOnly !== true ||
    candidate.safety.noAutoSend !== true
  ) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const rateLimitPerMin = Number(process.env.EMAIL_DRAFT_RATE_LIMIT_PER_MIN ?? "30");
  const rate = checkRateLimit({
    request,
    scope: "api_email_draft",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 30,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for email draft. Retry later." },
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

  try {
    // Users do not connect personal Gmail. Moltbot drafts only; backend controls send step.
    const data = await runEmailDraftWorkflow(validation.value);
    if (!validateResponseBody(data)) {
      return NextResponse.json({ error: "Email draft workflow returned invalid response shape." }, { status: 502 });
    }
    return NextResponse.json({
      draft: data,
      policy: {
        advisoryOnly: true,
        requiresHumanApproval: true,
        platformManagedEmailOnly: true
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email draft workflow failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
