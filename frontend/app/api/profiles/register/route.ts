import { NextResponse } from "next/server";
import {
  RegisteredProfileInput,
  isRegistrableRole,
  isWalletAddress,
  normalizeProfileInput,
  normalizeWalletAddress
} from "@/lib/profile-types";
import { upsertWalletProfile } from "@/lib/server/profiles-store";
import { verifyWalletChallenge } from "@/lib/server/profile-auth";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_DATA_URL_LENGTH = 1_500_000;

type RegisterProfileBody = {
  walletAddress?: unknown;
  challenge?: unknown;
  message?: unknown;
  signature?: unknown;
  profile?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseProfileInput(profile: unknown): { ok: true; value: RegisteredProfileInput } | { ok: false; error: string } {
  if (!profile || typeof profile !== "object") {
    return { ok: false, error: "profile must be an object." };
  }

  const candidate = profile as Partial<RegisteredProfileInput>;
  if (!isRegistrableRole(candidate.role)) {
    return { ok: false, error: "profile.role must be brand or influencer." };
  }
  if (!isNonEmptyString(candidate.displayName)) {
    return { ok: false, error: "profile.displayName is required." };
  }
  if (!isNonEmptyString(candidate.email)) {
    return { ok: false, error: "profile.email is required." };
  }
  if (!EMAIL_REGEX.test(candidate.email.trim())) {
    return { ok: false, error: "profile.email is invalid." };
  }
  if (!isNonEmptyString(candidate.instagram)) {
    return { ok: false, error: "profile.instagram is required." };
  }
  if (!isNonEmptyString(candidate.telegram)) {
    return { ok: false, error: "profile.telegram is required." };
  }
  if (!isNonEmptyString(candidate.x)) {
    return { ok: false, error: "profile.x is required." };
  }
  if (candidate.avatarDataUrl && typeof candidate.avatarDataUrl !== "string") {
    return { ok: false, error: "profile.avatarDataUrl must be a string when provided." };
  }
  if (candidate.avatarDataUrl && candidate.avatarDataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
    return { ok: false, error: "profile.avatarDataUrl is too large." };
  }

  return {
    ok: true,
    value: normalizeProfileInput({
      role: candidate.role,
      displayName: candidate.displayName,
      email: candidate.email,
      instagram: candidate.instagram,
      telegram: candidate.telegram,
      x: candidate.x,
      avatarDataUrl: candidate.avatarDataUrl
    })
  };
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = rawBody as RegisterProfileBody;
  if (!isWalletAddress(body.walletAddress)) {
    return NextResponse.json({ error: "walletAddress must be a valid EVM address." }, { status: 400 });
  }
  if (!isNonEmptyString(body.challenge)) {
    return NextResponse.json({ error: "challenge is required." }, { status: 400 });
  }
  if (!isNonEmptyString(body.message)) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }
  if (!isNonEmptyString(body.signature) || !body.signature.startsWith("0x")) {
    return NextResponse.json({ error: "signature is required." }, { status: 400 });
  }

  const parsedProfile = parseProfileInput(body.profile);
  if (!parsedProfile.ok) {
    return NextResponse.json({ error: parsedProfile.error }, { status: 400 });
  }

  try {
    const normalizedWallet = normalizeWalletAddress(body.walletAddress);
    const verifiedWallet = await verifyWalletChallenge({
      walletAddress: normalizedWallet,
      challenge: body.challenge,
      message: body.message,
      signature: body.signature as `0x${string}`
    });

    const profile = await upsertWalletProfile({
      walletAddress: verifiedWallet,
      role: parsedProfile.value.role,
      displayName: parsedProfile.value.displayName,
      email: parsedProfile.value.email,
      instagram: parsedProfile.value.instagram,
      telegram: parsedProfile.value.telegram,
      x: parsedProfile.value.x,
      avatarDataUrl: parsedProfile.value.avatarDataUrl
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register profile.";
    const status = /challenge|signature|wallet/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
