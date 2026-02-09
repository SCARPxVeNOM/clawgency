import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), "..", "openclaw", "logs", "agent-audit.log");
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ logs: [] });
    }

    const lines = fs
      .readFileSync(logPath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-300);

    const logs = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { malformed: true, raw: line };
      }
    });

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
