import { NextResponse } from "next/server";
import { assertAllowedLabel, readLabeledReplies } from "@/lib/server/email";
import { runOpenClawWorkflow } from "@/lib/server/openclaw";
import { checkRateLimit } from "@/lib/server/rate-limit";
import type { EmailReplyParseResponse } from "@/types/agent";

export const runtime = "nodejs";

type ReadRepliesRequest = {
  label?: string;
  maxResults?: number;
};

function validateRequestBody(body: unknown): { ok: true; value: ReadRepliesRequest } | { ok: false; error: string } {
  if (body === undefined || body === null || body === "") {
    return { ok: true, value: {} };
  }
  if (typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const candidate = body as Partial<ReadRepliesRequest>;
  if (candidate.label !== undefined && (typeof candidate.label !== "string" || !candidate.label.trim())) {
    return { ok: false, error: "label must be a non-empty string if provided." };
  }
  if (candidate.maxResults !== undefined) {
    if (!Number.isInteger(candidate.maxResults) || Number(candidate.maxResults) <= 0) {
      return { ok: false, error: "maxResults must be a positive integer." };
    }
  }

  return {
    ok: true,
    value: {
      label: candidate.label?.trim(),
      maxResults: candidate.maxResults
    }
  };
}

function validateParserOutput(body: unknown): body is EmailReplyParseResponse {
  if (!body || typeof body !== "object") {
    return false;
  }
  const candidate = body as Partial<EmailReplyParseResponse>;
  if (candidate.schemaVersion !== "1.0.0" || candidate.mode !== "advisory") {
    return false;
  }
  if (candidate.interest !== "yes" && candidate.interest !== "no" && candidate.interest !== "maybe") {
    return false;
  }
  if (!Array.isArray(candidate.questions)) {
    return false;
  }
  if (typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1) {
    return false;
  }
  if (typeof candidate.reasoning !== "string" || !candidate.reasoning.trim()) {
    return false;
  }
  if (candidate.requiresHumanReview !== true) {
    return false;
  }
  return true;
}

async function parseOptionalBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

async function runReadReplies(input: ReadRepliesRequest) {
  let label: string;
  try {
    label = assertAllowedLabel(input.label);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid label.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await readLabeledReplies({
      label,
      maxResults: input.maxResults
    });

    const parsed = [];
    for (const reply of result.replies) {
      const { data } = await runOpenClawWorkflow<EmailReplyParseResponse>(
        "emailReplyParse",
        {
          replyText: reply.bodyText,
          fromEmail: reply.fromEmail,
          threadId: reply.threadId,
          messageId: reply.messageId
        },
        12_000
      );

      if (!validateParserOutput(data)) {
        return NextResponse.json({ error: "Email reply parser returned invalid response shape." }, { status: 502 });
      }

      parsed.push({
        reply,
        parsed: data
      });
    }

    return NextResponse.json({
      mode: result.mode,
      label: result.label,
      count: parsed.length,
      parsedReplies: parsed,
      policy: {
        backendReadOnlyFromLabel: true,
        moltbotAdvisoryOnly: true,
        humanReviewRequired: true
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read replies.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const rateLimitPerMin = Number(process.env.EMAIL_REPLIES_RATE_LIMIT_PER_MIN ?? "60");
  const rate = checkRateLimit({
    request,
    scope: "api_email_replies_get",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 60,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for email replies. Retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec)
        }
      }
    );
  }

  return runReadReplies({});
}

export async function POST(request: Request) {
  const rateLimitPerMin = Number(process.env.EMAIL_REPLIES_RATE_LIMIT_PER_MIN ?? "60");
  const rate = checkRateLimit({
    request,
    scope: "api_email_replies_post",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 60,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for email replies. Retry later." },
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
    rawBody = await parseOptionalBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateRequestBody(rawBody);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  return runReadReplies(validation.value);
}
