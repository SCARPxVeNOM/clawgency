import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { createOffer, listOffersByWallet } from "@/lib/server/offers-store";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

export const runtime = "nodejs";

type CreateOfferBody = {
  brandWallet?: unknown;
  creatorWallet?: unknown;
  campaignHeadline?: unknown;
  deliverables?: unknown;
  timeline?: unknown;
  agencyFeeBps?: unknown;
  budgetBNB?: unknown;
  milestonesBNB?: unknown;
  note?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toMilestones(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("milestonesBNB must be an array of number strings.");
  }
  const normalized = value
    .map((row) => String(row).trim())
    .filter((row) => row.length > 0);
  if (normalized.length === 0) {
    throw new Error("At least one milestone must be provided.");
  }
  return normalized;
}

function toAgencyFeeBps(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3000) {
    throw new Error("agencyFeeBps must be an integer between 0 and 3000.");
  }
  return parsed;
}

function parseCreateBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object.");
  }
  const input = body as CreateOfferBody;
  if (!isNonEmptyString(input.brandWallet) || !isWalletAddress(input.brandWallet)) {
    throw new Error("brandWallet must be a valid wallet address.");
  }
  if (!isNonEmptyString(input.creatorWallet) || !isWalletAddress(input.creatorWallet)) {
    throw new Error("creatorWallet must be a valid wallet address.");
  }
  if (!isNonEmptyString(input.campaignHeadline)) {
    throw new Error("campaignHeadline is required.");
  }
  if (!isNonEmptyString(input.deliverables)) {
    throw new Error("deliverables is required.");
  }
  if (!isNonEmptyString(input.timeline)) {
    throw new Error("timeline is required.");
  }
  if (!isNonEmptyString(input.budgetBNB)) {
    throw new Error("budgetBNB is required.");
  }

  return {
    brandWallet: normalizeWalletAddress(input.brandWallet),
    creatorWallet: normalizeWalletAddress(input.creatorWallet),
    campaignHeadline: input.campaignHeadline.trim(),
    deliverables: input.deliverables.trim(),
    timeline: input.timeline.trim(),
    agencyFeeBps: toAgencyFeeBps(input.agencyFeeBps),
    budgetBNB: input.budgetBNB.trim(),
    milestonesBNB: toMilestones(input.milestonesBNB),
    note: typeof input.note === "string" ? input.note.trim() : ""
  };
}

function offersRateLimit(request: Request, scope: string) {
  const rateLimitPerMin = Number(process.env.OFFERS_RATE_LIMIT_PER_MIN ?? "120");
  return checkRateLimit({
    request,
    scope,
    limit: Number.isFinite(rateLimitPerMin) ? rateLimitPerMin : 120,
    windowMs: 60_000
  });
}

export async function GET(request: Request) {
  const rate = offersRateLimit(request, "api_offers_get");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for offers read. Retry later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) }
      }
    );
  }

  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet")?.trim() ?? "";
  if (!isWalletAddress(wallet)) {
    return NextResponse.json({ error: "wallet query parameter must be a valid wallet address." }, { status: 400 });
  }

  try {
    const offers = await listOffersByWallet(normalizeWalletAddress(wallet));
    return NextResponse.json({ offers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load offers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rate = offersRateLimit(request, "api_offers_post");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for offers create. Retry later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) }
      }
    );
  }

  let parsedBody: ReturnType<typeof parseCreateBody>;
  try {
    const body = await request.json();
    parsedBody = parseCreateBody(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const offer = await createOffer(parsedBody);
    return NextResponse.json({ offer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create offer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

