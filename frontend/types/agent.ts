export type Workflow1Request = {
  headline: string;
  budgetBNB: string;
  deliverables: string;
  timeline: string;
  brandAddr: `0x${string}`;
};

export type Workflow1Response = {
  brandIntent: string;
  budgetBNB: string;
  suggestedInfluencers: `0x${string}`[];
  confidence: {
    extraction: number;
    category: number;
    milestonePlan: number;
  };
  reasoning: string[];
  validationWarnings: string[];
  transactionProposal: {
    contractFunction: "createCampaign";
    params: [
      brandAddr: `0x${string}`,
      influencerAddr: `0x${string}`,
      milestonesWei: string[],
      agencyFeeBps: number
    ];
    humanApprovalRequired: true;
    autoExecute: false;
  };
};

export type Workflow2Request = {
  campaignId: number | string;
  proofHash: string;
  userId?: string;
  chainEventHash?: string;
};

export type Workflow2Response = {
  valid: boolean;
  reasoning: string;
  suggestion: "approve" | "reject";
  humanReviewComment: string;
};

export type Workflow3Request = {
  fromBlockOverride?: number;
};

export type Workflow3Response = {
  monitoringWindow: { fromBlock: number; toBlock: number };
  observedEvents: Array<{
    eventName: string;
    blockNumber: number;
    transactionHash: string;
    campaignId: number;
    userId: string;
  }>;
  alerts: Array<{
    type: "pending_approval" | "pending_proof";
    campaignId: number;
    severity: "low" | "medium" | "high";
    message: string;
  }>;
  recommendations: Array<{
    campaignId: number;
    recommendation: string;
  }>;
};

export type EmailDraftRequest = {
  brandName: string;
  brandEmail: string;
  influencerName?: string;
  influencerEmail: string;
  campaignTitle: string;
  campaignDetails: string;
  budgetBNB: string;
  ctaUrl: string;
  humanReviewerId?: string;
};

export type EmailDraftResponse = {
  schemaVersion: "1.0.0";
  mode: "advisory";
  draftId: string;
  subjectOptions: string[];
  recommendedSubject: string;
  cta: {
    label: string;
    url: string;
  };
  bodyText: string;
  bodyHtml: string;
  structuredCampaign: {
    brandName: string;
    influencerName: string;
    influencerEmail: string;
    campaignTitle: string;
    campaignDetails: string;
    budgetBNB: string;
  };
  reasoning: string[];
  safety: {
    requiresHumanApproval: true;
    platformManagedEmailOnly: true;
    noAutoSend: true;
  };
};

export type EmailReplyParseRequest = {
  replyText: string;
  fromEmail: string;
  threadId?: string;
  messageId?: string;
};

export type EmailReplyParseResponse = {
  schemaVersion: "1.0.0";
  mode: "advisory";
  interest: "yes" | "no" | "maybe";
  questions: string[];
  confidence: number;
  reasoning: string;
  requiresHumanReview: true;
};
