# Email Integration (Platform-Managed, Safe Mode)

## Design Summary

Clawgency email integration uses one platform-managed Gmail account, for example:

- `agency@clawgency.xyz`

End users (brands/influencers) only provide their contact email address for communication. They do not connect personal Gmail and do not provide OAuth tokens.

## Why Users Do Not Need Gmail Setup

- Email sending/reading happens through backend routes controlled by Clawgency.
- The sender mailbox is platform-owned and centrally managed.
- This removes user OAuth complexity and reduces credential exposure risk.

## Safety Model

Human-in-the-loop is mandatory:

- OpenClaw (Moltbot) drafts and parses only.
- Backend decides whether to send.
- `POST /api/email/send` requires:
  - `humanApprovedBy`
  - `humanApprovalConfirmed: true`
  - `approvalSessionId`
  - optional metadata: `campaignId`, `draftId`
- OpenClaw never sends emails directly and never calls Gmail API.
- Every send attempt is appended to `openclaw/logs/human-approval.log`.
- Approval log rows are HMAC-signed for tamper evidence (`HUMAN_APPROVAL_LOG_SIGNING_KEY`).

## API Endpoints

- `POST /api/email/draft`
  - Uses OpenClaw `emailDraft` workflow.
  - Returns structured draft JSON.
- `POST /api/email/send`
  - Sends via backend Gmail adapter only.
  - Uses platform-managed account only.
  - Writes append-only human approval audit row (success/failure outcome).
- `POST /api/email/replies`
  - Reads only from configured label (`GMAIL_REPLY_LABEL`).
  - Parses each reply via OpenClaw `emailReplyParse`.
- `GET /api/email/replies`
  - Convenience read+parse using default label and limits.
- `GET /api/email/approval-logs`
  - Returns recent human approval audit rows for governance review.
  - Returns signature validation status per row.
- `GET /api/email/oauth/start`
  - Generates one-time Google OAuth consent URL + state cookie.
- `GET /api/email/oauth/start?redirect=1`
  - Redirects directly to Google consent page.
- `GET /api/email/oauth/callback`
  - Exchanges auth code and stores refresh token on backend.

## OpenClaw Workflows

- `workflow4-email-drafting.js`
  - deterministic subject/body/CTA generation
  - advisory-only safety flags
- `workflow5-reply-parsing.js`
  - deterministic interest classification and question extraction

Schemas:

- `openclaw/schemas/email-draft-output.schema.json`
- `openclaw/schemas/email-reply-parse-output.schema.json`

## Gmail Permissions and Constraints

Recommended scopes for platform account integration:

- `gmail.send`
- `gmail.readonly`

Backend should read only labelled threads:

- default label: `clawgency-replies`
- enforced by `assertAllowedLabel` in `frontend/lib/server/email.ts`

## Demo Reliability Mode

Set in environment:

- `EMAIL_PROVIDER_MODE=mock`

In mock mode:

- No external Gmail API call is made.
- Replies are returned from deterministic mock records.
- API contract tests run without mailbox dependency.

Set `EMAIL_PROVIDER_MODE=live` only when:

- platform Gmail token is configured in one of these ways:
  - short-lived token: `GMAIL_ACCESS_TOKEN`
  - recommended long-lived flow:
    - `GOOGLE_OAUTH_CLIENT_ID`
    - `GOOGLE_OAUTH_CLIENT_SECRET`
    - `GMAIL_OAUTH_REDIRECT_URI`
    - `GMAIL_REFRESH_TOKEN_FILE` (auto-written by callback)
    - optional static fallback `GMAIL_REFRESH_TOKEN`
- controlled runtime policies are in place
- `HUMAN_APPROVAL_LOG_SIGNING_KEY` is set (required in production)
- rate limits are configured for email routes (draft/send/replies/log reads)

Recommended email API rate-limit env vars:

- `EMAIL_DRAFT_RATE_LIMIT_PER_MIN`
- `EMAIL_SEND_RATE_LIMIT_PER_MIN`
- `EMAIL_REPLIES_RATE_LIMIT_PER_MIN`
- `EMAIL_APPROVAL_LOG_RATE_LIMIT_PER_MIN`

One-time backend OAuth bootstrap:

1. Configure Google app redirect URI to match `GMAIL_OAUTH_REDIRECT_URI`.
2. Run frontend server and open `/api/email/oauth/start?redirect=1`.
3. Consent with the platform-managed Gmail account.
4. Callback stores refresh token to `GMAIL_REFRESH_TOKEN_FILE`.
5. Backend now refreshes access tokens automatically for send/read calls.

## Security Posture

- No user OAuth flows for Gmail.
- No user secrets passed to OpenClaw.
- OpenClaw receives only strict JSON payloads.
- OpenClaw outputs are schema-shaped and validated before use.
- Audit records are written to `openclaw/logs/agent-audit.log`.

## Limitations

- Single platform mailbox (no multi-tenant mailbox isolation yet).
- Reply parsing is deterministic heuristic NLP, not full semantic understanding.
- Label-based polling is not a full event stream architecture.

## Future Extensibility

- Add provider abstraction for SES/SendGrid while keeping advisory-only AI.
- Add signed campaign response links as fallback to email replies.
- Add stricter JSON schema validation (AJV) as middleware for all email routes.
- Add per-workspace policy engine for allowed recipient domains and approval chains.
