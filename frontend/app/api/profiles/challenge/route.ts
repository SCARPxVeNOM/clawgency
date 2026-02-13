import { NextResponse } from "next/server";
import { createWalletChallenge } from "@/lib/server/profile-auth";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

export const runtime = "nodejs";

type ChallengeRequestBody = {
  walletAddress?: unknown;
};

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const walletAddress = (rawBody as ChallengeRequestBody)?.walletAddress;
  if (!isWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "walletAddress must be a valid EVM address." }, { status: 400 });
  }

  try {
    const challengePayload = createWalletChallenge(normalizeWalletAddress(walletAddress));
    return NextResponse.json(challengePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create registration challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
