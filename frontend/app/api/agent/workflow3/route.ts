import { NextResponse } from "next/server";
import { runWorkflow3 } from "@/lib/server/workflows/workflow3";
import type { Workflow3Request, Workflow3Response } from "@/types/agent";

export const runtime = "nodejs";

function validateRequestBody(body: unknown): { ok: true; value: Workflow3Request } | { ok: false; error: string } {
  if (body === undefined || body === null || body === "") {
    return { ok: true, value: {} };
  }
  if (typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const candidate = body as Partial<Workflow3Request>;
  if (candidate.fromBlockOverride === undefined) {
    return { ok: true, value: {} };
  }
  if (!Number.isInteger(candidate.fromBlockOverride) || Number(candidate.fromBlockOverride) < 0) {
    return { ok: false, error: "fromBlockOverride must be a non-negative integer." };
  }

  return { ok: true, value: { fromBlockOverride: Number(candidate.fromBlockOverride) } };
}

function validateResponseBody(body: unknown): body is Workflow3Response {
  if (!body || typeof body !== "object") {
    return false;
  }
  const candidate = body as Partial<Workflow3Response>;
  if (
    !candidate.monitoringWindow ||
    typeof candidate.monitoringWindow.fromBlock !== "number" ||
    typeof candidate.monitoringWindow.toBlock !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(candidate.observedEvents) || !Array.isArray(candidate.alerts) || !Array.isArray(candidate.recommendations)) {
    return false;
  }
  return true;
}

function contractAddressConfigured(): boolean {
  return Boolean(
    (process.env.CONTRACT_ADDRESS_TESTNET ?? process.env.NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS ?? "").trim()
  );
}

async function runMonitoring(input: Workflow3Request) {
  if (!contractAddressConfigured()) {
    return NextResponse.json(
      {
        error:
          "Monitoring requires CONTRACT_ADDRESS_TESTNET or NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS in frontend runtime environment."
      },
      { status: 503 }
    );
  }

  try {
    const data = await runWorkflow3(input);
    if (!validateResponseBody(data)) {
      return NextResponse.json({ error: "Workflow3 returned invalid response shape." }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow3 execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function parseOptionalBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

export async function GET() {
  return runMonitoring({});
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await parseOptionalBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateRequestBody(rawBody);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  return runMonitoring(validation.value);
}
