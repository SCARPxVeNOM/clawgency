import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type HumanApprovalOutcome = "sent" | "failed";

export type HumanApprovalLogEntry = {
  timestamp: string;
  category: "email_send";
  approvalSessionId: string;
  humanApprovedBy: string;
  approvalConfirmed: true;
  campaignId: string | null;
  draftId: string | null;
  to: string;
  subject: string;
  threadId: string | null;
  messageId: string | null;
  providerMode: "mock" | "live" | "unknown";
  outcome: HumanApprovalOutcome;
  error: string | null;
};

type SignedApprovalLogEntry = HumanApprovalLogEntry & {
  signatureAlg: "hmac-sha256-v1";
  prevSignature: string | null;
  signature: string;
};

const HUMAN_APPROVAL_LOG_FILE = "human-approval.log";
const SIGNATURE_ALG: SignedApprovalLogEntry["signatureAlg"] = "hmac-sha256-v1";
const DEV_FALLBACK_SIGNING_KEY = "dev-insecure-human-approval-signing-key";

export function resolveHumanApprovalLogPath(): string {
  const configured = process.env.CLAWGENCY_HUMAN_APPROVAL_LOG_FILE?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }

  // Serverless-friendly default (Vercel allows writing to os.tmpdir()).
  return path.join(os.tmpdir(), "clawgency", HUMAN_APPROVAL_LOG_FILE);
}

function resolveSigningKey(): string {
  const configured = process.env.HUMAN_APPROVAL_LOG_SIGNING_KEY?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("HUMAN_APPROVAL_LOG_SIGNING_KEY is required in production.");
  }

  return DEV_FALLBACK_SIGNING_KEY;
}

function computeSignature(input: {
  entry: HumanApprovalLogEntry;
  prevSignature: string | null;
  signingKey: string;
}): string {
  const payload = JSON.stringify({
    ...input.entry,
    signatureAlg: SIGNATURE_ALG,
    prevSignature: input.prevSignature
  });
  return crypto.createHmac("sha256", input.signingKey).update(payload).digest("hex");
}

async function loadLastSignature(filePath: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index--) {
      try {
        const parsed = JSON.parse(lines[index]) as Partial<SignedApprovalLogEntry>;
        if (typeof parsed.signature === "string" && parsed.signature.trim()) {
          return parsed.signature.trim();
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function assertHumanApprovalLoggingReady(): void {
  resolveSigningKey();
}

export async function appendHumanApprovalLog(entry: HumanApprovalLogEntry): Promise<void> {
  const signingKey = resolveSigningKey();
  const filePath = resolveHumanApprovalLogPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const prevSignature = await loadLastSignature(filePath);
  const signature = computeSignature({
    entry,
    prevSignature,
    signingKey
  });

  const signed: SignedApprovalLogEntry = {
    ...entry,
    signatureAlg: SIGNATURE_ALG,
    prevSignature,
    signature
  };

  await fs.appendFile(filePath, `${JSON.stringify(signed)}\n`, "utf8");
}

export async function readHumanApprovalLogs(limit = 300): Promise<Array<Record<string, unknown>>> {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
  const filePath = resolveHumanApprovalLogPath();

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const signingKey = resolveSigningKey();
  const lines = raw.split(/\r?\n/).filter(Boolean).slice(-safeLimit);
  const output: Array<Record<string, unknown>> = [];
  let expectedPrevSignature: string | null = null;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as SignedApprovalLogEntry;
      const baseEntry: HumanApprovalLogEntry = {
        timestamp: parsed.timestamp,
        category: parsed.category,
        approvalSessionId: parsed.approvalSessionId,
        humanApprovedBy: parsed.humanApprovedBy,
        approvalConfirmed: parsed.approvalConfirmed,
        campaignId: parsed.campaignId,
        draftId: parsed.draftId,
        to: parsed.to,
        subject: parsed.subject,
        threadId: parsed.threadId,
        messageId: parsed.messageId,
        providerMode: parsed.providerMode,
        outcome: parsed.outcome,
        error: parsed.error
      };

      const expectedSignature = computeSignature({
        entry: baseEntry,
        prevSignature: parsed.prevSignature ?? null,
        signingKey
      });
      const chainValid = (parsed.prevSignature ?? null) === expectedPrevSignature;
      const signatureValid = parsed.signature === expectedSignature;
      const verified = chainValid && signatureValid;

      output.push({
        ...parsed,
        signatureValid: verified,
        signatureChainValid: chainValid,
        signatureDataValid: signatureValid
      });

      expectedPrevSignature = parsed.signature ?? expectedPrevSignature;
    } catch {
      output.push({
        malformed: true,
        raw: line,
        signatureValid: false
      });
    }
  }

  return output;
}
