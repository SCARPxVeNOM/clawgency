import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { declineOffer } from "@/lib/server/offers-store";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

export const runtime = "nodejs";

type DeclineBody = {
  actorWallet?: unknown;
  note?: unknown;
};

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object.");
  }
  const candidate = body as DeclineBody;
  if (typeof candidate.actorWallet !== "string" || !isWalletAddress(candidate.actorWallet)) {
    throw new Error("actorWallet must be a valid wallet address.");
  }

  return {
    actorWallet: normalizeWalletAddress(candidate.actorWallet),
    note: typeof candidate.note === "string" ? candidate.note.trim() : ""
  };
}

export async function POST(
  request: Request,
  context: { params: { offerId: string } }
) {
  const rateLimitPerMin = Number(process.env.OFFERS_RATE_LIMIT_PER_MIN ?? "120");
  const rate = checkRateLimit({
    request,
    scope: "api_offers_decline_post",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 120,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for offer decline. Retry later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) }
      }
    );
  }

  let parsedBody: ReturnType<typeof parseBody>;
  try {
    const rawBody = await request.json();
    parsedBody = parseBody(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const offer = await declineOffer({
      offerId: context.params.offerId,
      actorWallet: parsedBody.actorWallet,
      note: parsedBody.note
    });
    return NextResponse.json({ offer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to decline offer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

