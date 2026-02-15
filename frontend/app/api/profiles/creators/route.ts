import { NextResponse } from "next/server";
import { fetchProfilesByRole } from "@/lib/server/profiles-store";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const configuredLimit = Number(process.env.PROFILES_RATE_LIMIT_PER_MIN ?? "120");
  const rate = checkRateLimit({
    request,
    scope: "api_profiles_creators",
    limit: Number.isFinite(configuredLimit) ? configuredLimit : 120,
    windowMs: 60_000
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for creators list. Retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec)
        }
      }
    );
  }

  try {
    const creators = await fetchProfilesByRole("influencer");
    return NextResponse.json({
      creators
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load creators.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
