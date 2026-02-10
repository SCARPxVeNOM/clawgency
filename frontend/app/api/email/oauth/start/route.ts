import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildGmailOAuthConsentUrl, gmailOAuthScopes } from "@/lib/server/email";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "clawgency_gmail_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

function resolveRedirectUri(request: Request): string {
  const configured = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/api/email/oauth/callback", request.url).toString();
}

export async function GET(request: Request) {
  try {
    const redirectUri = resolveRedirectUri(request);
    const state = crypto.randomBytes(24).toString("hex");
    const authUrl = buildGmailOAuthConsentUrl({
      redirectUri,
      state
    });

    const requestUrl = new URL(request.url);
    const shouldRedirect = requestUrl.searchParams.get("redirect") === "1";

    const response = shouldRedirect
      ? NextResponse.redirect(authUrl, { status: 302 })
      : NextResponse.json({
          authUrl,
          redirectUri,
          scopes: gmailOAuthScopes(),
          policy: {
            backendManagedOnly: true,
            humanInitiatedOneTimeConsent: true
          }
        });

    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: redirectUri.toLowerCase().startsWith("https://"),
      path: "/",
      maxAge: STATE_TTL_SECONDS
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Gmail OAuth flow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
