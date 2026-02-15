import type { Workflow1Request, Workflow1Response } from "@/types/agent";
import { appendAgentAuditLog } from "@/lib/server/agent-audit";
import { runWithOpenClawFallback } from "@/lib/server/workflows/openclaw-runner";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const INFLUENCER_CANDIDATES = {
  fitness: [
    "0x2d6476A654F5eE2e695f2fB9d7d4F31f5003F1A1",
    "0x8F249fDFe0db8dA0c911A6A431D76D7D8A85A17B"
  ],
  gaming: [
    "0x7AbD56E4D2B00c983D3394fB6fF24D3F6841f2aD",
    "0x44055fDb5192e2A2e983B7FDd992FdA5e728A8d1"
  ],
  fashion: [
    "0x91BC837620Dbe842126242EE0F4061cB1984F7F9",
    "0x56B74297c5a7F2d2A6B6F8fBA6f71aD8733F2eD3"
  ],
  general: [
    "0x6f3B5023154F39057F7E7aBb0e6f2E3D131fA6F5",
    "0x4fE2D71E8D301d7024d86C9c5f85Fb2FA1aE18CD"
  ]
} as const;

function inferCategory(
  headline: string,
  deliverables: string
): { category: keyof typeof INFLUENCER_CANDIDATES; confidence: number } {
  const text = `${headline} ${deliverables}`.toLowerCase();
  if (/fitness|workout|gym|nutrition/.test(text)) return { category: "fitness", confidence: 0.9 };
  if (/gaming|esports|stream|twitch/.test(text)) return { category: "gaming", confidence: 0.86 };
  if (/fashion|beauty|makeup|style/.test(text)) return { category: "fashion", confidence: 0.84 };
  return { category: "general", confidence: 0.68 };
}

function parseBudgetBnb(rawBudget: string): number {
  const budget = Number(rawBudget);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error("budgetBNB must be a positive number.");
  }
  return budget;
}

function splitMilestones(budgetBnb: number, deliverables: string, timeline: string) {
  const deliverableCount = deliverables
    .split(/\+|,|and/gi)
    .map((x) => x.trim())
    .filter(Boolean).length;
  const defaultMilestoneCount = deliverableCount >= 3 ? 3 : 2;

  const timelineDaysMatch = String(timeline).match(/(\d+)\s*day/);
  const timelineDays = timelineDaysMatch ? Number(timelineDaysMatch[1]) : 7;

  const count = timelineDays <= 3 ? Math.max(2, defaultMilestoneCount) : defaultMilestoneCount;

  const ratios = count === 2 ? [0.6, 0.4] : [0.4, 0.3, 0.3];
  const milestones = ratios.map((r) => Number((budgetBnb * r).toFixed(6)));

  const sum = milestones.reduce((a, b) => a + b, 0);
  milestones[milestones.length - 1] = Number((milestones[milestones.length - 1] + (budgetBnb - sum)).toFixed(6));

  return { milestonesBnb: milestones, payoutSchedule: count === 2 ? "60/40" : "40/30/30" };
}

function toWei(valueBnb: number): string {
  const [whole = "0", frac = ""] = String(valueBnb).split(".");
  const wholeWei = BigInt(whole) * 10n ** 18n;
  const fracWei = BigInt((frac + "0".repeat(18)).slice(0, 18));
  return (wholeWei + fracWei).toString();
}

function validatePatterns(input: Workflow1Request): string[] {
  const warnings: string[] = [];
  if (!input.headline || !input.deliverables || !input.timeline) {
    warnings.push("Missing one or more high-signal fields: headline, deliverables, timeline.");
  }
  if (String(input.budgetBNB).includes("-")) {
    warnings.push("Budget contains a negative sign.");
  }
  if (String(input.deliverables).length > 200) {
    warnings.push("Deliverables text unusually long; verify manually.");
  }
  return warnings;
}

async function runWorkflow1Local(input: Workflow1Request): Promise<Workflow1Response> {
  const budgetBnb = parseBudgetBnb(input.budgetBNB);
  const { category, confidence: categoryConfidence } = inferCategory(input.headline ?? "", input.deliverables ?? "");
  const { milestonesBnb, payoutSchedule } = splitMilestones(budgetBnb, input.deliverables ?? "", input.timeline ?? "");

  const brandAddr = ADDRESS_REGEX.test(input.brandAddr ?? "")
    ? (input.brandAddr as `0x${string}`)
    : ("0x1111111111111111111111111111111111111111" as `0x${string}`);

  const influencerAddr = INFLUENCER_CANDIDATES[category][0] as `0x${string}`;
  const agencyFeeBps = category === "general" ? 800 : 700;
  const warnings = validatePatterns(input);

  const output: Workflow1Response = {
    brandIntent: `${input.headline} with ${input.deliverables} over ${input.timeline}`,
    budgetBNB: String(input.budgetBNB),
    suggestedInfluencers: INFLUENCER_CANDIDATES[category] as unknown as `0x${string}`[],
    confidence: {
      extraction: 0.93,
      category: categoryConfidence,
      milestonePlan: warnings.length > 0 ? 0.74 : 0.88
    },
    reasoning: [
      `Mapped request to '${category}' influencer category based on headline/deliverable keywords.`,
      `Selected payout schedule ${payoutSchedule} to match delivery timeline and reduce release risk.`,
      `Applied default agency fee of ${(agencyFeeBps / 100).toFixed(2)}% for this category.`
    ],
    validationWarnings: warnings,
    transactionProposal: {
      contractFunction: "createCampaign",
      params: [brandAddr, influencerAddr, milestonesBnb.map((m) => toWei(m)), agencyFeeBps],
      humanApprovalRequired: true,
      autoExecute: false
    }
  };

  await appendAgentAuditLog({
    timestamp: new Date().toISOString(),
    workflow: "workflow1-intelligent-drafting",
    userId: brandAddr.toLowerCase(),
    chainEventHash: "N/A",
    recommendation: "Drafted campaign proposal. Awaiting human review.",
    confidence: output.confidence
  });

  return output;
}

export async function runWorkflow1(input: Workflow1Request): Promise<Workflow1Response> {
  return runWithOpenClawFallback({
    workflow: "workflow1",
    input,
    timeoutMs: 15_000,
    fallback: () => runWorkflow1Local(input)
  });
}
