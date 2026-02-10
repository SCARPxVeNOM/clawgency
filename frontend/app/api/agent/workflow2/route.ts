import { NextResponse } from "next/server";
import { runOpenClawWorkflow } from "@/lib/server/openclaw";
import type { Workflow2Request, Workflow2Response } from "@/types/agent";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCampaignId(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(parsed) || Number(parsed) <= 0) {
    throw new Error("campaignId must be a positive integer.");
  }
  return Number(parsed);
}

function validateRequestBody(body: unknown): { ok: true; value: Workflow2Request } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const candidate = body as Partial<Workflow2Request>;
  let campaignId: number;
  try {
    campaignId = parseCampaignId(candidate.campaignId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid campaignId.";
    return { ok: false, error: message };
  }

  if (!isNonEmptyString(candidate.proofHash)) {
    return { ok: false, error: "proofHash is required." };
  }

  return {
    ok: true,
    value: {
      campaignId,
      proofHash: candidate.proofHash.trim(),
      userId: isNonEmptyString(candidate.userId) ? candidate.userId.trim() : undefined,
      chainEventHash: isNonEmptyString(candidate.chainEventHash) ? candidate.chainEventHash.trim() : undefined
    }
  };
}

function validateResponseBody(body: unknown): body is Workflow2Response {
  if (!body || typeof body !== "object") {
    return false;
  }
  const candidate = body as Partial<Workflow2Response>;
  if (typeof candidate.valid !== "boolean") {
    return false;
  }
  if (!isNonEmptyString(candidate.reasoning)) {
    return false;
  }
  if (candidate.suggestion !== "approve" && candidate.suggestion !== "reject") {
    return false;
  }
  if (!isNonEmptyString(candidate.humanReviewComment)) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateRequestBody(rawBody);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const { data } = await runOpenClawWorkflow<Workflow2Response>("workflow2", validation.value);
    if (!validateResponseBody(data)) {
      return NextResponse.json({ error: "Workflow2 returned invalid response shape." }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow2 execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

