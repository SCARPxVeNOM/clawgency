# Workflow Unification Plan (Single Source of Truth)

## Objective

Remove duplicated logic between:

- `openclaw/workflows/*.js`
- `frontend/lib/server/workflows/*.ts`

and converge on one shared implementation with thin runtime adapters.

## Current Duplication

- `workflow1-intelligent-drafting` exists in both JS and TS.
- `workflow2-proof-validation` exists in both JS and TS.
- `workflow3-monitoring` exists in both JS and TS (behavior drift already visible).
- `workflow4/5/6` email workflows exist in both JS and TS.

## Target Architecture

1. Canonical logic package:
   - `packages/workflow-core/src/`
2. API adapter layer:
   - `frontend/lib/server/workflows/*` imports from `workflow-core` only
3. CLI adapter layer:
   - `openclaw/workflows/*.js` becomes minimal wrapper invoking `workflow-core` build output

## Phase Plan

### Phase 1: Contract First (Types + Schemas)

1. Define canonical workflow contracts in one place:
   - `packages/workflow-core/src/contracts.ts`
2. Keep `frontend/types/agent.ts` as re-export from `workflow-core`.
3. Validate all workflow outputs against a schema (`zod` or JSON schema validator) at adapter boundaries.

Deliverable:
- One authoritative input/output type set for workflows 1-6.

### Phase 2: Extract Pure Workflow Engines

1. Move business logic into pure functions:
   - `packages/workflow-core/src/workflow1.ts`
   - `packages/workflow-core/src/workflow2.ts`
   - `packages/workflow-core/src/workflow3.ts`
   - `packages/workflow-core/src/workflow4.ts`
   - `packages/workflow-core/src/workflow5.ts`
   - `packages/workflow-core/src/workflow6.ts`
2. Keep side effects (file logging, env resolution, HTTP calls) outside these functions via injected dependencies.

Deliverable:
- Deterministic workflow engines reusable by any runtime.

### Phase 3: Build Runtime Adapters

1. Next.js adapter (`frontend/lib/server/workflows/*`):
   - injects audit logger, env config, RPC/email clients
   - performs request/response validation
2. OpenClaw CLI adapter (`openclaw/workflows/*.js`):
   - parse CLI/file input
   - call shared workflow engine
   - write CLI audit logs

Deliverable:
- No duplicated business logic in adapters.

### Phase 4: Deprecate Legacy Implementations

1. Remove duplicated logic from:
   - `openclaw/workflows/workflow1-intelligent-drafting.js` (and 2/3/4/5/6)
   - `frontend/lib/server/workflows/workflow1.ts` (and 2/3/email*)
2. Replace with wrappers/import shims.

Deliverable:
- One implementation path per workflow.

### Phase 5: Regression Lock

1. Add parity tests:
   - given same input, API adapter and CLI adapter output identical JSON (excluding timestamp/log fields).
2. Expand CI:
   - run `workflow-core` unit tests
   - run adapter contract tests

Deliverable:
- Drift prevention in CI.

## File-by-File Migration Map

### New

- `packages/workflow-core/src/contracts.ts`
- `packages/workflow-core/src/workflow1.ts` ... `workflow6.ts`
- `packages/workflow-core/src/index.ts`
- `packages/workflow-core/package.json`

### Update

- `frontend/lib/server/workflows/workflow1.ts` ... `workflow3.ts`
- `frontend/lib/server/workflows/email-draft.ts`
- `frontend/lib/server/workflows/email-reply-parse.ts`
- `frontend/lib/server/workflows/email-completion-draft.ts`
- `openclaw/workflows/workflow1-intelligent-drafting.js` ... `workflow6-completion-email-drafting.js`
- `frontend/types/agent.ts` (re-export shared contracts)

### Remove (after parity)

- Duplicate business logic blocks in both frontend and openclaw workflow files.

## Acceptance Criteria

1. Every workflow business rule is defined once in `workflow-core`.
2. CLI and API produce equivalent output for golden fixtures.
3. Monitoring behavior parity is verified (alerts/recommendations no longer drift).
4. CI fails if adapter output deviates from shared schema/contracts.
5. No user-facing route or CLI command changes required.

## Rollout Strategy

1. Implement workflow1 end-to-end as pilot.
2. Add parity tests for workflow1.
3. Migrate workflows 2-6 one by one.
4. Remove legacy code only after each workflow passes parity + integration tests.

