import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { recoverMessageAddress } from "viem";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

type WalletChallengePayload = {
  walletAddress: `0x${string}`;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function getProfileAuthSecret(): string {
  const secret = process.env.PROFILE_AUTH_SECRET ?? process.env.HUMAN_APPROVAL_LOG_SIGNING_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("PROFILE_AUTH_SECRET (or HUMAN_APPROVAL_LOG_SIGNING_KEY) is not configured.");
  }
  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string): string {
  return createHmac("sha256", getProfileAuthSecret()).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function parseChallenge(challenge: string): WalletChallengePayload {
  const [encodedPayload, providedSignature] = challenge.split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid challenge format.");
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqualHex(expectedSignature, providedSignature)) {
    throw new Error("Challenge signature is invalid.");
  }

  let payloadRaw: unknown;
  try {
    payloadRaw = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    throw new Error("Challenge payload is invalid.");
  }

  if (!payloadRaw || typeof payloadRaw !== "object") {
    throw new Error("Challenge payload is malformed.");
  }

  const payload = payloadRaw as Partial<WalletChallengePayload>;
  if (
    !payload.walletAddress ||
    !isWalletAddress(payload.walletAddress) ||
    typeof payload.nonce !== "string" ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.expiresAt !== "number"
  ) {
    throw new Error("Challenge payload is malformed.");
  }

  return {
    walletAddress: normalizeWalletAddress(payload.walletAddress),
    nonce: payload.nonce,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt
  };
}

function buildChallenge(walletAddress: `0x${string}`): string {
  const now = Date.now();
  const payload: WalletChallengePayload = {
    walletAddress,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: now,
    expiresAt: now + CHALLENGE_TTL_MS
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function buildRegistrationMessage(walletAddress: `0x${string}`, challenge: string, expiresAt: number): string {
  return [
    "Clawgency Wallet Registration",
    "Sign this message to verify wallet ownership for your profile.",
    "No gas fee is required.",
    `Wallet: ${walletAddress}`,
    `Challenge: ${challenge}`,
    `ExpiresAt: ${new Date(expiresAt).toISOString()}`
  ].join("\n");
}

export function createWalletChallenge(walletAddress: `0x${string}`) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const challenge = buildChallenge(normalizedWallet);
  const parsed = parseChallenge(challenge);

  return {
    challenge,
    message: buildRegistrationMessage(parsed.walletAddress, challenge, parsed.expiresAt),
    expiresAt: new Date(parsed.expiresAt).toISOString()
  };
}

export async function verifyWalletChallenge(input: {
  walletAddress: `0x${string}`;
  challenge: string;
  message: string;
  signature: `0x${string}`;
}) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const payload = parseChallenge(input.challenge);

  if (payload.expiresAt < Date.now()) {
    throw new Error("Challenge has expired. Please retry registration.");
  }

  if (payload.walletAddress !== walletAddress) {
    throw new Error("Challenge wallet does not match request wallet.");
  }

  const expectedMessage = buildRegistrationMessage(payload.walletAddress, input.challenge, payload.expiresAt);
  if (input.message !== expectedMessage) {
    throw new Error("Signed message does not match expected challenge message.");
  }

  const recoveredAddress = await recoverMessageAddress({
    message: input.message,
    signature: input.signature
  });

  if (normalizeWalletAddress(recoveredAddress) !== payload.walletAddress) {
    throw new Error("Wallet signature verification failed.");
  }

  return payload.walletAddress;
}
