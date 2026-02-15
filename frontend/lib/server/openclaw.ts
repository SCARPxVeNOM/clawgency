import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const OPENCLAW_WORKFLOW_SCRIPTS = {
  workflow1: "workflows/workflow1-intelligent-drafting.js",
  workflow2: "workflows/workflow2-proof-validation.js",
  workflow3: "workflows/workflow3-monitoring.js",
  emailDraft: "workflows/workflow4-email-drafting.js",
  emailReplyParse: "workflows/workflow5-reply-parsing.js",
  emailCompletionDraft: "workflows/workflow6-completion-email-drafting.js"
} as const;

const SAFE_ENV_KEYS = [
  "PATH",
  "Path",
  "SYSTEMROOT",
  "SystemRoot",
  "COMSPEC",
  "ComSpec",
  "PATHEXT",
  "WINDIR",
  "TMP",
  "TEMP",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "NODE_ENV",
  "FORCE_COLOR",
  "NO_COLOR"
] as const;

export type OpenClawWorkflow = keyof typeof OPENCLAW_WORKFLOW_SCRIPTS;

function normalizePath(value: string): string {
  return path.resolve(value).toLowerCase();
}

function assertInsideRoot(root: string, candidate: string, label: string): string {
  const normalizedRoot = normalizePath(root);
  const normalizedCandidate = normalizePath(candidate);
  if (normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)) {
    return candidate;
  }
  throw new Error(`${label} is outside allowed OpenClaw root.`);
}

function defaultOpenClawRoot(): string {
  // Next.js server routes run from /frontend, so parent folder is project root.
  return path.resolve(process.cwd(), "..", "openclaw");
}

function resolveFrontendOpenClawWorkflowScript(workflow: OpenClawWorkflow): string | null {
  if (workflow !== "workflow3") {
    return null;
  }

  const filename = path.basename(OPENCLAW_WORKFLOW_SCRIPTS[workflow]);
  const candidate = path.resolve(process.cwd(), "openclaw", "workflows", filename);
  return fs.existsSync(candidate) ? candidate : null;
}

export function resolveOpenClawRoot(): string {
  const configuredRoot = process.env.OPENCLAW_ROOT?.trim();
  const root = configuredRoot ? path.resolve(configuredRoot) : defaultOpenClawRoot();
  if (!fs.existsSync(root)) {
    throw new Error(`OpenClaw root not found at: ${root}`);
  }
  return root;
}

export function resolveOpenClawWorkflowScript(workflow: OpenClawWorkflow): string {
  const frontendScript = resolveFrontendOpenClawWorkflowScript(workflow);
  if (frontendScript) {
    return frontendScript;
  }

  const root = resolveOpenClawRoot();
  const relative = OPENCLAW_WORKFLOW_SCRIPTS[workflow];
  const scriptPath = path.resolve(root, relative);
  return assertInsideRoot(root, scriptPath, `Workflow ${workflow} script`);
}

export function resolveOpenClawAuditLogPath(): string {
  const root = resolveOpenClawRoot();
  const filePath = path.resolve(root, "logs", "agent-audit.log");
  return assertInsideRoot(root, filePath, "Audit log path");
}

function buildWorkflowEnv(workflow: OpenClawWorkflow, scriptPath: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "production"
  };
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      (env as Record<string, string | undefined>)[key] = value;
    }
  }

  // Pass only workflow-specific non-secret env values.
  if (workflow === "workflow3") {
    const useTestnet = (process.env.NEXT_PUBLIC_USE_TESTNET ?? "true").toLowerCase() === "true";
    const bscTestnetRpc =
      process.env.BSC_TESTNET_RPC_URL ??
      process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ??
      "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
    const bscMainnetRpc =
      process.env.BSC_MAINNET_RPC_URL ??
      process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL ??
      "https://bsc-dataseed.binance.org";
    const testnetAddress =
      process.env.CONTRACT_ADDRESS_TESTNET ?? process.env.NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS ?? "";
    const mainnetAddress =
      process.env.CONTRACT_ADDRESS_MAINNET ?? process.env.NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS ?? "";

    (env as Record<string, string | undefined>).NEXT_PUBLIC_USE_TESTNET = useTestnet ? "true" : "false";
    (env as Record<string, string | undefined>).BSC_TESTNET_RPC_URL = bscTestnetRpc;
    (env as Record<string, string | undefined>).BSC_MAINNET_RPC_URL = bscMainnetRpc;
    (env as Record<string, string | undefined>).CONTRACT_ADDRESS_TESTNET = testnetAddress;
    (env as Record<string, string | undefined>).CONTRACT_ADDRESS_MAINNET = mainnetAddress;
  }

  const openClawRoot = path.resolve(path.dirname(scriptPath), "..");
  const runtimeDir =
    process.env.OPENCLAW_RUNTIME_DIR?.trim() || path.join(os.tmpdir(), "clawgency", "openclaw-runtime");
  const auditLogFile =
    process.env.OPENCLAW_AUDIT_LOG_FILE?.trim() || path.join(os.tmpdir(), "clawgency", "agent-audit.log");
  const monitorStateFile =
    process.env.OPENCLAW_MONITOR_STATE_FILE?.trim() ||
    path.join(os.tmpdir(), "clawgency", "openclaw-monitor-state.json");
  const userMapFile = process.env.OPENCLAW_USER_MAP_FILE?.trim() || path.resolve(openClawRoot, "config", "user-map.json");
  const nodePath = process.env.NODE_PATH?.trim();
  const frontendNodeModules = path.resolve(process.cwd(), "node_modules");

  (env as Record<string, string | undefined>).OPENCLAW_ROOT = openClawRoot;
  (env as Record<string, string | undefined>).OPENCLAW_RUNTIME_DIR = runtimeDir;
  (env as Record<string, string | undefined>).OPENCLAW_AUDIT_LOG_FILE = auditLogFile;
  (env as Record<string, string | undefined>).OPENCLAW_MONITOR_STATE_FILE = monitorStateFile;
  (env as Record<string, string | undefined>).OPENCLAW_USER_MAP_FILE = userMapFile;
  (env as Record<string, string | undefined>).NODE_PATH = nodePath
    ? `${frontendNodeModules}${path.delimiter}${nodePath}`
    : frontendNodeModules;

  return env;
}

function parseJsonOutput<T>(workflow: OpenClawWorkflow, stdout: string): T {
  const raw = stdout.trim();
  if (!raw) {
    throw new Error(`Workflow ${workflow} returned empty output.`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const snippet = raw.length > 240 ? `${raw.slice(0, 240)}...` : raw;
    throw new Error(`Workflow ${workflow} returned invalid JSON: ${snippet}`);
  }
}

export async function runOpenClawWorkflow<T>(
  workflow: OpenClawWorkflow,
  input?: unknown,
  timeoutMs = 20_000
): Promise<{ data: T; stderr: string }> {
  const scriptPath = resolveOpenClawWorkflowScript(workflow);
  const scriptOpenClawRoot = path.resolve(path.dirname(scriptPath), "..");
  const workflowArgs = [scriptPath];
  if (input !== undefined) {
    workflowArgs.push(JSON.stringify(input));
  }

  const { stdout, stderr } = await execFileAsync(process.execPath, workflowArgs, {
    cwd: path.resolve(scriptOpenClawRoot, ".."),
    env: buildWorkflowEnv(workflow, scriptPath),
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true
  });

  return {
    data: parseJsonOutput<T>(workflow, stdout),
    stderr: stderr.trim()
  };
}
