import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type EmailProviderMode = "mock" | "live";

export type PlatformSendEmailInput = {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
};

export type PlatformSendEmailResult = {
  mode: EmailProviderMode;
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
};

export type PlatformEmailReply = {
  messageId: string;
  threadId: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  bodyText: string;
};

type GmailMessagePayload = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePayload[];
  headers?: Array<{ name?: string; value?: string }>;
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: GmailMessagePayload;
  snippet?: string;
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GMAIL_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly"
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Platform-managed account only. Use minimally scoped token:
// - https://www.googleapis.com/auth/gmail.send
// - https://www.googleapis.com/auth/gmail.readonly

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;
let runtimeRefreshToken: string | null = null;

const MOCK_REPLIES: PlatformEmailReply[] = [
  {
    messageId: "mock-msg-1",
    threadId: "mock-thread-1",
    fromEmail: "creator.demo@example.com",
    subject: "Re: Clawgency campaign brief",
    receivedAt: new Date("2026-02-10T09:00:00.000Z").toISOString(),
    bodyText: "I am interested. Can you share timeline and usage terms?"
  },
  {
    messageId: "mock-msg-2",
    threadId: "mock-thread-2",
    fromEmail: "creator2.demo@example.com",
    subject: "Re: Partnership request",
    receivedAt: new Date("2026-02-10T10:30:00.000Z").toISOString(),
    bodyText: "Thanks for reaching out. I need more details before confirming."
  }
];

function getProviderMode(): EmailProviderMode {
  return (process.env.EMAIL_PROVIDER_MODE ?? "mock").toLowerCase() === "live" ? "live" : "mock";
}

export function platformFromEmail(): string {
  return (process.env.CLAWGENCY_PLATFORM_EMAIL ?? "agency@clawgency.xyz").trim().toLowerCase();
}

export function platformReplyLabel(): string {
  return (process.env.GMAIL_REPLY_LABEL ?? "clawgency-replies").trim();
}

export function assertAllowedLabel(requestedLabel?: string): string {
  const configured = platformReplyLabel();
  if (!requestedLabel || !requestedLabel.trim()) {
    return configured;
  }
  if (requestedLabel.trim() !== configured) {
    throw new Error(`Only the configured reply label "${configured}" is allowed.`);
  }
  return configured;
}

type OAuthConsentInput = {
  redirectUri: string;
  state: string;
};

type OAuthCodeExchangeInput = {
  code: string;
  redirectUri: string;
};

type OAuthCodeExchangeResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
};

function resolveRefreshTokenFilePath(): string {
  const configured = process.env.GMAIL_REFRESH_TOKEN_FILE?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), ".secrets", "gmail-refresh-token.json");
}

async function readRefreshTokenFromFile(): Promise<string | null> {
  const filePath = resolveRefreshTokenFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = JSON.parse(trimmed) as { refreshToken?: string } | string;
    if (typeof parsed === "string") {
      return parsed.trim() || null;
    }

    if (parsed && typeof parsed.refreshToken === "string" && parsed.refreshToken.trim()) {
      return parsed.refreshToken.trim();
    }
    return null;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return null;
    }
    throw new Error(`Failed reading GMAIL_REFRESH_TOKEN_FILE: ${(error as Error).message}`);
  }
}

async function resolveRefreshToken(): Promise<string | null> {
  const envToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  if (envToken) {
    return envToken;
  }

  if (runtimeRefreshToken) {
    return runtimeRefreshToken;
  }

  return readRefreshTokenFromFile();
}

export function gmailOAuthScopes(): string[] {
  return [...GMAIL_OAUTH_SCOPES];
}

export function buildGmailOAuthConsentUrl(input: OAuthConsentInput): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID is required for OAuth consent.");
  }
  if (!input.redirectUri.trim()) {
    throw new Error("redirectUri is required.");
  }
  if (!input.state.trim()) {
    throw new Error("state is required.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GMAIL_OAUTH_SCOPES.join(" "),
    state: input.state
  });

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGmailAuthCode(input: OAuthCodeExchangeInput): Promise<OAuthCodeExchangeResult> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required for OAuth code exchange.");
  }
  if (!input.code.trim()) {
    throw new Error("Authorization code is required.");
  }
  if (!input.redirectUri.trim()) {
    throw new Error("redirectUri is required.");
  }

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange auth code for Gmail tokens (${response.status}): ${text.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  if (!payload.access_token) {
    throw new Error("OAuth code exchange returned no access_token.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    scope: payload.scope,
    tokenType: payload.token_type
  };
}

export async function persistGmailRefreshToken(refreshToken: string): Promise<{ filePath: string }> {
  const trimmed = refreshToken.trim();
  if (!trimmed) {
    throw new Error("refreshToken is required.");
  }

  runtimeRefreshToken = trimmed;
  tokenCache = null;

  const filePath = resolveRefreshTokenFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        refreshToken: trimmed,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );

  return { filePath };
}

function mustValidEmail(value: string, field: string) {
  const trimmed = value.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new Error(`${field} must be a valid email address.`);
  }
  return trimmed.toLowerCase();
}

async function fetchAccessTokenFromRefreshToken(refreshToken: string): Promise<TokenCache> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Live mode requires either GMAIL_ACCESS_TOKEN, or GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET + GMAIL_REFRESH_TOKEN (env or token file)."
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh Gmail access token (${response.status}): ${text.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("Refresh-token exchange returned no access_token.");
  }

  const expiresInSeconds = typeof payload.expires_in === "number" && payload.expires_in > 0 ? payload.expires_in : 3600;
  const expiresAtMs = Date.now() + Math.max(60, expiresInSeconds - 60) * 1000;

  return {
    accessToken: payload.access_token,
    expiresAtMs
  };
}

async function getLiveAccessToken(): Promise<string> {
  const staticToken = process.env.GMAIL_ACCESS_TOKEN?.trim();
  if (staticToken) {
    return staticToken;
  }

  if (tokenCache && tokenCache.expiresAtMs > Date.now()) {
    return tokenCache.accessToken;
  }

  const refreshToken = await resolveRefreshToken();
  if (!refreshToken) {
    throw new Error(
      "Live mode has no refresh token. Run /api/email/oauth/start to complete one-time backend OAuth, or set GMAIL_REFRESH_TOKEN."
    );
  }

  tokenCache = await fetchAccessTokenFromRefreshToken(refreshToken);
  return tokenCache.accessToken;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${pad}`, "base64").toString("utf8");
}

function readHeader(payload: GmailMessagePayload | undefined, name: string): string {
  if (!payload?.headers) {
    return "";
  }
  const lower = name.toLowerCase();
  const row = payload.headers.find((header) => (header.name ?? "").toLowerCase() === lower);
  return row?.value ?? "";
}

function extractEmailAddress(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : trimmed).replace(/^"+|"+$/g, "").trim();
  if (!candidate) {
    return "";
  }

  return EMAIL_REGEX.test(candidate) ? candidate : "";
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractBodyText(payload: GmailMessagePayload | undefined): string {
  if (!payload) {
    return "";
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      const text = extractBodyText(part);
      if (text) {
        return text;
      }
    }
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

async function gmailRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getLiveAccessToken();
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail API request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}

function buildMimeMessage(from: string, input: PlatformSendEmailInput): string {
  const to = mustValidEmail(input.to, "to");
  const subject = input.subject.replace(/\r?\n/g, " ").trim();

  if (input.bodyHtml) {
    const boundary = `clawgency_${crypto.randomUUID().replace(/-/g, "")}`;
    return [
      `From: Clawgency <${from}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      input.bodyText,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      input.bodyHtml,
      "",
      `--${boundary}--`,
      ""
    ].join("\r\n");
  }

  return [
    `From: Clawgency <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.bodyText,
    ""
  ].join("\r\n");
}

export async function sendPlatformEmail(input: PlatformSendEmailInput): Promise<PlatformSendEmailResult> {
  const from = mustValidEmail(platformFromEmail(), "CLAWGENCY_PLATFORM_EMAIL");
  const to = mustValidEmail(input.to, "to");
  const mode = getProviderMode();

  if (mode === "mock") {
    return {
      mode,
      messageId: `mock_msg_${Date.now()}`,
      threadId: input.threadId || `mock_thread_${Date.now()}`,
      from,
      to,
      subject: input.subject.trim()
    };
  }

  const mime = buildMimeMessage(from, input);
  const raw = encodeBase64Url(mime);
  const body: { raw: string; threadId?: string } = { raw };
  if (input.threadId) {
    body.threadId = input.threadId;
  }

  const result = await gmailRequest<{ id: string; threadId: string }>("/messages/send", {
    method: "POST",
    body: JSON.stringify(body)
  });

  return {
    mode,
    messageId: result.id,
    threadId: result.threadId,
    from,
    to,
    subject: input.subject.trim()
  };
}

export async function readLabeledReplies(input: {
  label?: string;
  maxResults?: number;
}): Promise<{ mode: EmailProviderMode; label: string; replies: PlatformEmailReply[] }> {
  const label = assertAllowedLabel(input.label);
  const maxResults = Math.min(Math.max(Number(input.maxResults ?? 10), 1), 50);
  const mode = getProviderMode();

  if (mode === "mock") {
    return {
      mode,
      label,
      replies: MOCK_REPLIES.slice(0, maxResults)
    };
  }

  const from = mustValidEmail(platformFromEmail(), "CLAWGENCY_PLATFORM_EMAIL");
  const query = encodeURIComponent(`label:${label}`);
  const queryMaxResults = Math.min(50, Math.max(maxResults * 3, maxResults));
  const list = await gmailRequest<{ threads?: Array<{ id: string }> }>(
    `/threads?maxResults=${queryMaxResults}&q=${query}`,
    { method: "GET" }
  );

  const threads = list.threads ?? [];
  const replies: PlatformEmailReply[] = [];
  for (const thread of threads) {
    try {
      const fullThread = await gmailRequest<{ id: string; messages?: GmailMessage[] }>(
        `/threads/${thread.id}?format=full`,
        { method: "GET" }
      );
      const threadMessages = fullThread.messages ?? [];

      for (const message of threadMessages) {
        const fromHeader = readHeader(message.payload, "From");
        const parsedFrom = extractEmailAddress(fromHeader);

        // Exclude messages authored by the platform mailbox itself.
        if (parsedFrom === from || fromHeader.toLowerCase().includes(from)) {
          continue;
        }

        const bodyText = extractBodyText(message.payload) || (message.snippet ?? "");
        replies.push({
          messageId: message.id,
          threadId: message.threadId,
          fromEmail: fromHeader,
          subject: readHeader(message.payload, "Subject"),
          receivedAt: readHeader(message.payload, "Date"),
          bodyText
        });

        if (replies.length >= maxResults) {
          break;
        }
      }

      if (replies.length >= maxResults) {
        break;
      }
    } catch {
      // Skip unreadable thread IDs so one bad item does not fail all reply parsing.
      continue;
    }
  }

  return {
    mode,
    label,
    replies
  };
}
