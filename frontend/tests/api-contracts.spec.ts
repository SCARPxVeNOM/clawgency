import { expect, test } from "@playwright/test";

const workflow1Payload = {
  headline: "Need fitness influencer",
  budgetBNB: "1",
  deliverables: "Instagram reel + TikTok",
  timeline: "3 days",
  brandAddr: "0x1111111111111111111111111111111111111111"
};

test("workflow1 route returns structured transaction proposal", async ({ request }) => {
  const response = await request.post("/api/agent/workflow1", {
    data: workflow1Payload
  });
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.transactionProposal.contractFunction).toBe("createCampaign");
  expect(body.transactionProposal.humanApprovalRequired).toBe(true);
  expect(body.transactionProposal.autoExecute).toBe(false);
  expect(Array.isArray(body.transactionProposal.params[2])).toBe(true);
  expect(body.transactionProposal.params[2].length).toBeGreaterThan(0);
});

test("workflow2 route validates proof format and returns deterministic decision", async ({ request }) => {
  const response = await request.post("/api/agent/workflow2", {
    data: {
      campaignId: 12,
      proofHash: "ipfs://bafybeigdyrztx7qk2x4x5cbslk5vfnxny4yhx2m4f6d7dq3lv2xxqz6zxe",
      userId: "integration_test_user",
      chainEventHash: "0xtesthash"
    }
  });
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(typeof body.valid).toBe("boolean");
  expect(["approve", "reject"]).toContain(body.suggestion);
  expect(typeof body.reasoning).toBe("string");
});

test("workflow3 route returns either monitoring payload or a clear env configuration error", async ({ request }) => {
  const response = await request.post("/api/agent/workflow3", {
    data: {}
  });

  expect([200, 500, 503]).toContain(response.status());
  const body = await response.json();

  if (response.status() === 200) {
    expect(typeof body.monitoringWindow.fromBlock).toBe("number");
    expect(typeof body.monitoringWindow.toBlock).toBe("number");
    expect(Array.isArray(body.alerts)).toBe(true);
  } else if (response.status() === 503) {
    expect(typeof body.error).toBe("string");
    expect(body.error).toContain("Monitoring requires");
  } else {
    expect(typeof body.error).toBe("string");
  }
});

test("email draft route returns advisory draft schema", async ({ request }) => {
  const response = await request.post("/api/email/draft", {
    data: {
      brandName: "PulseFit",
      brandEmail: "brand@pulsefit.com",
      influencerName: "Riya",
      influencerEmail: "riya.creator@example.com",
      campaignTitle: "Fitness Challenge",
      campaignDetails: "1 IG reel + 1 TikTok on challenge launch.",
      budgetBNB: "1.2",
      ctaUrl: "https://clawgency.xyz/campaigns/demo-123",
      humanReviewerId: "qa_reviewer_1"
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.draft.mode).toBe("advisory");
  expect(body.draft.safety.requiresHumanApproval).toBe(true);
  expect(body.draft.safety.noAutoSend).toBe(true);
  expect(Array.isArray(body.draft.subjectOptions)).toBe(true);
  expect(body.policy.platformManagedEmailOnly).toBe(true);
});

test("email send route works in backend-controlled mode", async ({ request }) => {
  const response = await request.post("/api/email/send", {
    data: {
      to: "riya.creator@example.com",
      subject: "Campaign invite",
      bodyText: "Please review the campaign details.",
      humanApprovedBy: "qa_human_approval",
      humanApprovalConfirmed: true,
      approvalSessionId: "approval_test_0001",
      campaignId: "campaign_42",
      draftId: "draft_42"
    }
  });

  expect([200, 500]).toContain(response.status());
  const body = await response.json();
  if (response.status() === 200) {
    expect(body.policy.explicitHumanApprovalGate).toBe(true);
    expect(body.policy.sentByBackendOnly).toBe(true);
    expect(body.policy.platformManagedAccountOnly).toBe(true);
    expect(body.approval.confirmed).toBe(true);
    expect(body.approval.approvalSessionId).toBe("approval_test_0001");
  } else {
    expect(typeof body.error).toBe("string");
  }
});

test("email send route rejects request without explicit human confirmation", async ({ request }) => {
  const response = await request.post("/api/email/send", {
    data: {
      to: "riya.creator@example.com",
      subject: "Campaign invite",
      bodyText: "Please review the campaign details.",
      humanApprovedBy: "qa_human_approval",
      approvalSessionId: "approval_test_0002",
      humanApprovalConfirmed: false
    }
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
  expect(body.error).toContain("humanApprovalConfirmed");
});

test("email approval logs route returns signed audit rows", async ({ request }) => {
  const response = await request.get("/api/email/approval-logs?limit=5");
  expect([200, 500]).toContain(response.status());

  const body = await response.json();
  if (response.status() === 200) {
    expect(typeof body.count).toBe("number");
    expect(Array.isArray(body.logs)).toBe(true);
    if (body.logs.length > 0) {
      expect(typeof body.logs[0].signature).toBe("string");
      expect(typeof body.logs[0].signatureValid).toBe("boolean");
    }
  } else {
    expect(typeof body.error).toBe("string");
  }
});

test("email replies route returns parsed advisory intents", async ({ request }) => {
  const response = await request.post("/api/email/replies", {
    data: {
      maxResults: 2
    }
  });

  expect([200, 400, 500]).toContain(response.status());
  const body = await response.json();
  if (response.status() === 200) {
    expect(Array.isArray(body.parsedReplies)).toBe(true);
    if (body.parsedReplies.length > 0) {
      expect(["yes", "no", "maybe"]).toContain(body.parsedReplies[0].parsed.interest);
      expect(body.parsedReplies[0].parsed.requiresHumanReview).toBe(true);
    }
  } else {
    expect(typeof body.error).toBe("string");
  }
});
