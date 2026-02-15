import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { counterOffer } from "@/lib/server/offers-store";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

export const runtime = "nodejs";

type CounterBody = {
  creatorWallet?: unknown;
  budgetBNB?: unknown;
  milestonesBNB?: unknown;
  note?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object.");
  }

  const candidate = body as CounterBody;
  if (!isNonEmptyString(candidate.creatorWallet) || !isWalletAddress(candidate.creatorWallet)) {
    throw new Error("creatorWallet must be a valid wallet address.");
  }
  if (!isNonEmptyString(candidate.budgetBNB)) {
    throw new Error("budgetBNB is required.");
  }
  if (!Array.isArray(candidate.milestonesBNB) || candidate.milestonesBNB.length === 0) {
    throw new Error("milestonesBNB must include at least one value.");
  }

  return {
    actorWallet: normalizeWalletAddress(candidate.creatorWallet),
    budgetBNB: candidate.budgetBNB.trim(),
    milestonesBNB: candidate.milestonesBNB.map((row) => String(row).trim()).filter(Boolean),
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
    scope: "api_offers_counter_post",
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 120,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for counter offers. Retry later." },
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
    const offer = await counterOffer({
      offerId: context.params.offerId,
      actorWallet: parsedBody.actorWallet,
      budgetBNB: parsedBody.budgetBNB,
      milestonesBNB: parsedBody.milestonesBNB,
      note: parsedBody.note
    });
    return NextResponse.json({ offer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to counter offer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

