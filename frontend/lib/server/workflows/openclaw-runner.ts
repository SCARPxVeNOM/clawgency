import { runOpenClawWorkflow, type OpenClawWorkflow } from "@/lib/server/openclaw";

type OpenClawFallbackOptions<T> = {
  workflow: OpenClawWorkflow;
  input?: unknown;
  fallback: () => Promise<T>;
  timeoutMs?: number;
  strictScript?: boolean;
};

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function isWorkflowEnabled(workflow: OpenClawWorkflow): boolean {
  const globallyEnabled = envFlag("OPENCLAW_USE_SCRIPT_WORKFLOWS", true);
  if (!globallyEnabled) {
    return false;
  }

  // Workflow3 script depends on root-level deps that may not exist in frontend-only installs.
  if (workflow === "workflow3") {
    return envFlag("OPENCLAW_USE_SCRIPT_WORKFLOW3", false);
  }

  const specificFlag = `OPENCLAW_USE_SCRIPT_${workflow.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}`;
  return envFlag(specificFlag, true);
}

export async function runWithOpenClawFallback<T>({
  workflow,
  input,
  fallback,
  timeoutMs,
  strictScript = false
}: OpenClawFallbackOptions<T>): Promise<T> {
  if (!isWorkflowEnabled(workflow)) {
    return fallback();
  }

  try {
    const { data } = await runOpenClawWorkflow<T>(workflow, input, timeoutMs);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (strictScript) {
      throw new Error(`[openclaw] ${workflow} script mode failed: ${message}`);
    }

    console.warn(`[openclaw] ${workflow} failed, using local fallback: ${message}`);
    return fallback();
  }
}
