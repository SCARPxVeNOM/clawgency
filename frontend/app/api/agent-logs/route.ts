import { NextResponse } from "next/server";
import { readAgentAuditLogs } from "@/lib/server/agent-audit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const logs = await readAgentAuditLogs(300);
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
