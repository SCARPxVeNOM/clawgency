# Security & Sandboxing

## Threat Model

Primary risks:

- Unauthorized fund movement
- Agent prompt injection causing unsafe actions
- Private key leakage
- Incomplete auditability of decisions
- Role confusion in UI (brand/influencer/admin)

## Smart Contract Controls

- `Ownable` governance for emergency pause and treasury control.
- `ReentrancyGuard` on fund release logic.
- `Pausable` kill-switch for incident response.
- Strict role checks (`brand` vs `influencer`) per campaign.
- Checks-effects-interactions payout flow.
- Milestone proof requirement before approval.

## OpenClaw Sandboxing Rules

Operational constraints:

- No private keys in agent runtime environment.
- Read-only recommendation mode for workflows.
- No transaction signing/broadcast in scripts.
- No direct Gmail API access from OpenClaw scripts.
- No user Gmail OAuth tokens accepted by OpenClaw inputs.
- Input schema validation before processing.
- Audit log append-only behavior in `openclaw/logs/agent-audit.log`.

Recommended OS-level sandbox policy:

- Filesystem allowlist:
  - `openclaw/workflows`
  - `openclaw/logs`
  - `openclaw/templates`
- Filesystem denylist:
  - `.env` with private keys
  - wallet keystore directories
- Network:
  - allow BNB RPC + approved APIs only
  - deny arbitrary outbound hosts

## Safe Prompting

Use templates in `openclaw/templates/safe-prompt-template.md`:

- Explicitly prohibit transaction signing and execution.
- Require deterministic JSON output.
- Require confidence and reasoning fields.
- Require human approval marker.

## UI Safety Measures

- Role-gated pages (`RoleGuard`) for brand/influencer/admin views.
- Modal confirmation for all state-changing actions.
- Toast + transaction logger visibility for operator awareness.
- Manual wallet confirmation required for every on-chain action.
- Email sending route requires explicit human approver metadata before dispatch.

## Logging & Audit Trail

Audit fields include:

- `timestamp`
- `workflow`
- `userId`
- `chainEventHash`
- `recommendation`

This enables post-incident reconstruction and compliance evidence.

## Risks, Mitigations, Tradeoffs

- Risk: Agent false positives on proof validation.
  - Mitigation: assistant output is advisory only; human approval still required.
  - Tradeoff: slower workflow due to review gate.
- Risk: Contract upgrade introduces UI/ABI mismatch.
  - Mitigation: explicit env address management + versioned ABI files.
  - Tradeoff: additional deployment coordination overhead.
- Risk: Monitoring script misses events during downtime.
  - Mitigation: persisted `lastProcessedBlock` state and replay window.
  - Tradeoff: slight duplicate processing complexity.
