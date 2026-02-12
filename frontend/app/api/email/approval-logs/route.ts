import { NextResponse } from "next/server";
import { readHumanApprovalLogs } from "@/lib/server/human-approval";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimitPerMin = Number(process.env.EMAIL_APPROVAL_LOG_RATE_LIMIT_PER_MIN ?? "120");
  const rate = checkRateLimit({
    request,
    scope: "api_email_approval_logs",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 120,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for approval log reads. Retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec)
        }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(rawLimit) ? rawLimit : 100;

    const logs = (await readHumanApprovalLogs(limit))
      .filter(
        (entry) =>
          typeof entry.signature === "string" &&
          typeof entry.signatureValid === "boolean"
      )
      .reverse();

    return NextResponse.json({
      count: logs.length,
      logs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read human approval logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
