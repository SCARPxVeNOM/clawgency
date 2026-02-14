import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type AgentAuditLogEntry = Record<string, unknown>;

function resolveAuditLogFilePath(): string {
  const configured = process.env.CLAWGENCY_AGENT_AUDIT_LOG_FILE?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }

  // Serverless-friendly default (Vercel allows writing to os.tmpdir()).
  return path.join(os.tmpdir(), "clawgency", "agent-audit.log");
}

export async function appendAgentAuditLog(entry: AgentAuditLogEntry): Promise<void> {
  const filePath = resolveAuditLogFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Best-effort only. Never fail the API because an audit write failed.
  }
}

export async function readAgentAuditLogs(limit = 300): Promise<AgentAuditLogEntry[]> {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 2000);
  const filePath = resolveAuditLogFilePath();

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const lines = raw.split(/\r?\n/).filter(Boolean).slice(-safeLimit);
  return lines.map((line) => {
    try {
      return JSON.parse(line) as AgentAuditLogEntry;
    } catch {
      return { malformed: true, raw: line } as AgentAuditLogEntry;
    }
  });
}

