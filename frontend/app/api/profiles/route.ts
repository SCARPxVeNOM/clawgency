import { NextResponse } from "next/server";
import { fetchProfilesByWallets } from "@/lib/server/profiles-store";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

export const runtime = "nodejs";

function parseWallets(requestUrl: string): `0x${string}`[] {
  const url = new URL(requestUrl);
  const singleWallet = url.searchParams.get("wallet");
  const batchWalletsRaw = url.searchParams.get("wallets");
  const repeatedWallets = url.searchParams.getAll("wallet");

  const mergedWallets = [
    ...(singleWallet ? [singleWallet] : []),
    ...(batchWalletsRaw ? batchWalletsRaw.split(",") : []),
    ...repeatedWallets
  ]
    .map((wallet) => wallet.trim())
    .filter((wallet) => wallet.length > 0);

  const normalizedWallets = mergedWallets
    .filter(isWalletAddress)
    .map((wallet) => normalizeWalletAddress(wallet));

  return Array.from(new Set(normalizedWallets));
}

export async function GET(request: Request) {
  const wallets = parseWallets(request.url);
  if (wallets.length === 0) {
    return NextResponse.json({ error: "Provide at least one wallet or wallets query parameter." }, { status: 400 });
  }

  try {
    const profiles = await fetchProfilesByWallets(wallets);
    return NextResponse.json({ profiles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profiles.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
