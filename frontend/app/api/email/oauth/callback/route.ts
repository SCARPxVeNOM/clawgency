import { NextResponse } from "next/server";
import { exchangeGmailAuthCode, persistGmailRefreshToken } from "@/lib/server/email";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "clawgency_gmail_oauth_state";

function resolveRedirectUri(request: Request): string {
  const configured = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/api/email/oauth/callback", request.url).toString();
}

function maskToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 8) {
    return "***";
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

function readStateCookie(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  for (const row of cookies) {
    if (!row.startsWith(`${OAUTH_STATE_COOKIE}=`)) {
      continue;
    }
    return decodeURIComponent(row.slice(OAUTH_STATE_COOKIE.length + 1));
  }
  return "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readStateCookie(request);

  if (errorParam) {
    const response = NextResponse.json({ error: `Google OAuth error: ${errorParam}` }, { status: 400 });
    clearStateCookie(response);
    return response;
  }

  if (!code) {
    const response = NextResponse.json({ error: "Missing OAuth code in callback." }, { status: 400 });
    clearStateCookie(response);
    return response;
  }

  if (!state || !expectedState || state !== expectedState) {
    const response = NextResponse.json({ error: "Invalid OAuth state. Please restart the OAuth flow." }, { status: 400 });
    clearStateCookie(response);
    return response;
  }

  try {
    const redirectUri = resolveRedirectUri(request);
    const tokens = await exchangeGmailAuthCode({
      code,
      redirectUri
    });

    if (!tokens.refreshToken) {
      const response = NextResponse.json(
        {
          error:
            "OAuth completed but Google did not return a refresh token. Remove prior app access and retry with consent prompt."
        },
        { status: 400 }
      );
      clearStateCookie(response);
      return response;
    }

    const persisted = await persistGmailRefreshToken(tokens.refreshToken);
    const response = NextResponse.json({
      success: true,
      refreshTokenStored: true,
      refreshTokenPreview: maskToken(tokens.refreshToken),
      storagePath: persisted.filePath,
      scope: tokens.scope ?? "",
      tokenType: tokens.tokenType ?? "",
      note: "Backend can now refresh Gmail access tokens automatically."
    });
    clearStateCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed.";
    const response = NextResponse.json({ error: message }, { status: 500 });
    clearStateCookie(response);
    return response;
  }
}
