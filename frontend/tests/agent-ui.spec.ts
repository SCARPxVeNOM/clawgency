import { expect, test } from "@playwright/test";

test("brand dashboard can generate and apply AI draft proposal", async ({ page }) => {
  await page.route("**/api/agent/workflow1*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        brandIntent: "Need fitness influencer with Instagram reel + TikTok over 3 days",
        budgetBNB: "1",
        suggestedInfluencers: [
          "0x2d6476A654F5eE2e695f2fB9d7d4F31f5003F1A1",
          "0x8F249fDFe0db8dA0c911A6A431D76D7D8A85A17B"
        ],
        confidence: {
          extraction: 0.93,
          category: 0.9,
          milestonePlan: 0.88
        },
        reasoning: [
          "Mapped request to fitness.",
          "Used split schedule."
        ],
        validationWarnings: [],
        transactionProposal: {
          contractFunction: "createCampaign",
          params: [
            "0x1111111111111111111111111111111111111111",
            "0x2d6476A654F5eE2e695f2fB9d7d4F31f5003F1A1",
            ["600000000000000000", "400000000000000000"],
            700
          ],
          humanApprovalRequired: true,
          autoExecute: false
        }
      })
    });
  });

  await page.goto("/brand/dashboard");
  await page.evaluate(() => window.localStorage.setItem("clawgency_role", "brand"));
  await page.reload();
  await page.getByRole("button", { name: "Generate AI Proposal" }).click();

  await expect(page.getByRole("button", { name: "Apply Proposal To Form" })).toBeVisible();
  await expect(page.getByText(/Need fitness influencer with Instagram reel \+ TikTok over 3 days/i)).toBeVisible();
  await page.getByRole("button", { name: "Apply Proposal To Form" }).click();

  await expect(page.getByPlaceholder("Influencer wallet")).toHaveValue(
    "0x2d6476A654F5eE2e695f2fB9d7d4F31f5003F1A1"
  );
  await expect(page.getByPlaceholder("Milestones in BNB, comma-separated")).toHaveValue("0.6,0.4");
  await expect(page.getByPlaceholder("Agency fee in bps (e.g. 500)")).toHaveValue("700");
});

test("admin dashboard can run monitoring scan via workflow3 route", async ({ page }) => {
  await page.route("**/api/agent/workflow3*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        monitoringWindow: { fromBlock: 10, toBlock: 20 },
        observedEvents: [
          {
            eventName: "ProofSubmitted",
            blockNumber: 15,
            transactionHash: "0xtxhash1",
            campaignId: 1,
            userId: "brand_demo_1"
          }
        ],
        alerts: [
          {
            type: "pending_approval",
            campaignId: 1,
            severity: "medium",
            message: "1 milestone awaiting brand approval."
          }
        ],
        recommendations: [
          {
            campaignId: 1,
            recommendation: "Review and approve latest proof."
          }
        ]
      })
    });
  });

  await page.goto("/admin/analytics");
  await page.evaluate(() => window.localStorage.setItem("clawgency_role", "admin"));
  await page.reload();
  await page.getByRole("button", { name: "Run Monitor Now" }).click();

  await expect(page.getByText("Window: 10 to 20")).toBeVisible();
  await expect(page.getByText("Observed events: 1")).toBeVisible();
  await expect(page.getByText("Alerts: 1")).toBeVisible();
});
