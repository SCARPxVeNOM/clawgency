export type OfferStatus = "pending_creator" | "countered" | "accepted" | "declined";

export type OfferHistoryType =
  | "brand_offer"
  | "creator_counter"
  | "brand_accept"
  | "brand_decline"
  | "creator_decline";

export type OfferHistoryEntry = {
  type: OfferHistoryType;
  actorWallet: `0x${string}`;
  budgetBNB: string;
  milestonesBNB: string[];
  note: string;
  createdAt: string;
};

export type NegotiationOffer = {
  id: string;
  brandWallet: `0x${string}`;
  creatorWallet: `0x${string}`;
  campaignHeadline: string;
  deliverables: string;
  timeline: string;
  agencyFeeBps: number;
  status: OfferStatus;
  currentBudgetBNB: string;
  currentMilestonesBNB: string[];
  currentNote: string;
  history: OfferHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

