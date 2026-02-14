import { NextResponse } from "next/server";
import { runWorkflow1 } from "@/lib/server/workflows/workflow1";
import type { Workflow1Request, Workflow1Response } from "@/types/agent";

export const runtime = "nodejs";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRequestBody(body: unknown): { ok: true; value: Workflow1Request } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const candidate = body as Partial<Workflow1Request>;
  if (!isNonEmptyString(candidate.headline)) {
    return { ok: false, error: "headline is required." };
  }
  if (!isNonEmptyString(candidate.deliverables)) {
    return { ok: false, error: "deliverables is required." };
  }
  if (!isNonEmptyString(candidate.timeline)) {
    return { ok: false, error: "timeline is required." };
  }
  if (!isNonEmptyString(candidate.budgetBNB)) {
    return { ok: false, error: "budgetBNB is required." };
  }

  const budget = Number(candidate.budgetBNB);
  if (!Number.isFinite(budget) || budget <= 0) {
    return { ok: false, error: "budgetBNB must be a positive number string." };
  }
  if (!isNonEmptyString(candidate.brandAddr) || !ADDRESS_REGEX.test(candidate.brandAddr)) {
    return { ok: false, error: "brandAddr must be a valid EVM address." };
  }

  return {
    ok: true,
    value: {
      headline: candidate.headline.trim(),
      budgetBNB: String(candidate.budgetBNB).trim(),
      deliverables: candidate.deliverables.trim(),
      timeline: candidate.timeline.trim(),
      brandAddr: candidate.brandAddr as `0x${string}`
    }
  };
}

function validateResponseBody(body: unknown): body is Workflow1Response {
  if (!body || typeof body !== "object") {
    return false;
  }
  const candidate = body as Partial<Workflow1Response>;
  if (!isNonEmptyString(candidate.brandIntent) || !isNonEmptyString(candidate.budgetBNB)) {
    return false;
  }
  if (!Array.isArray(candidate.suggestedInfluencers) || candidate.suggestedInfluencers.length === 0) {
    return false;
  }
  if (!candidate.suggestedInfluencers.every((entry) => typeof entry === "string" && ADDRESS_REGEX.test(entry))) {
    return false;
  }
  if (
    !candidate.confidence ||
    typeof candidate.confidence.extraction !== "number" ||
    typeof candidate.confidence.category !== "number" ||
    typeof candidate.confidence.milestonePlan !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(candidate.reasoning) || !candidate.reasoning.every((item) => typeof item === "string")) {
    return false;
  }
  if (
    !candidate.transactionProposal ||
    candidate.transactionProposal.contractFunction !== "createCampaign" ||
    candidate.transactionProposal.autoExecute !== false ||
    candidate.transactionProposal.humanApprovalRequired !== true
  ) {
    return false;
  }
  if (!Array.isArray(candidate.transactionProposal.params) || candidate.transactionProposal.params.length !== 4) {
    return false;
  }
  const params = candidate.transactionProposal.params;
  if (
    typeof params[0] !== "string" ||
    !ADDRESS_REGEX.test(params[0]) ||
    typeof params[1] !== "string" ||
    !ADDRESS_REGEX.test(params[1]) ||
    !Array.isArray(params[2]) ||
    !params[2].every((entry) => typeof entry === "string") ||
    typeof params[3] !== "number"
  ) {
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
    const data = await runWorkflow1(validation.value);
    if (!validateResponseBody(data)) {
      return NextResponse.json({ error: "Workflow1 returned invalid response shape." }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow1 execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
