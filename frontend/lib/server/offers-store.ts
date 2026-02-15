import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { NegotiationOffer, OfferHistoryEntry, OfferStatus } from "@/types/offers";
import { isWalletAddress, normalizeWalletAddress } from "@/lib/profile-types";

type CreateOfferInput = {
  brandWallet: `0x${string}`;
  creatorWallet: `0x${string}`;
  campaignHeadline: string;
  deliverables: string;
  timeline: string;
  agencyFeeBps: number;
  budgetBNB: string;
  milestonesBNB: string[];
  note?: string;
};

type CounterOfferInput = {
  offerId: string;
  actorWallet: `0x${string}`;
  budgetBNB: string;
  milestonesBNB: string[];
  note?: string;
};

type AcceptOfferInput = {
  offerId: string;
  actorWallet: `0x${string}`;
  note?: string;
};

type DeclineOfferInput = {
  offerId: string;
  actorWallet: `0x${string}`;
  note?: string;
};

type OfferDb = {
  offers: NegotiationOffer[];
};

function resolveOffersFilePath(): string {
  const configured = process.env.CLAWGENCY_OFFERS_FILE?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return path.join(os.tmpdir(), "clawgency", "offers.json");
}

function isPositiveNumberString(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function normalizeBudget(value: string): string {
  const trimmed = value.trim();
  if (!isPositiveNumberString(trimmed)) {
    throw new Error("Budget must be a positive number string.");
  }
  return trimmed;
}

function normalizeMilestones(values: string[]): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("At least one milestone is required.");
  }
  const normalized = values.map((value) => normalizeBudget(String(value)));
  if (normalized.length === 0) {
    throw new Error("At least one milestone is required.");
  }
  return normalized;
}

function normalizeOfferId(value: string): string {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{6,120}$/.test(trimmed)) {
    throw new Error("offerId format is invalid.");
  }
  return trimmed;
}

function ensureWalletAddress(value: string, field: string): `0x${string}` {
  if (!isWalletAddress(value)) {
    throw new Error(`${field} must be a valid wallet address.`);
  }
  return normalizeWalletAddress(value);
}

async function readOfferDb(): Promise<OfferDb> {
  const filePath = resolveOffersFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<OfferDb>;
    if (!parsed || !Array.isArray(parsed.offers)) {
      return { offers: [] };
    }
    return { offers: parsed.offers as NegotiationOffer[] };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return { offers: [] };
    }
    throw error;
  }
}

async function writeOfferDb(data: OfferDb): Promise<void> {
  const filePath = resolveOffersFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

function makeHistoryEntry(input: {
  type: OfferHistoryEntry["type"];
  actorWallet: `0x${string}`;
  budgetBNB: string;
  milestonesBNB: string[];
  note?: string;
}): OfferHistoryEntry {
  return {
    type: input.type,
    actorWallet: input.actorWallet,
    budgetBNB: input.budgetBNB,
    milestonesBNB: input.milestonesBNB,
    note: (input.note ?? "").trim(),
    createdAt: new Date().toISOString()
  };
}

function createOfferId(): string {
  const random = crypto.randomBytes(6).toString("hex");
  return `offer_${Date.now()}_${random}`;
}

function ensureCanUpdateStatus(status: OfferStatus): void {
  if (status === "accepted" || status === "declined") {
    throw new Error("Offer is closed and can no longer be updated.");
  }
}

function sortByUpdatedAtDesc(offers: NegotiationOffer[]): NegotiationOffer[] {
  return offers.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function listOffersByWallet(walletAddress: string): Promise<NegotiationOffer[]> {
  const normalizedWallet = ensureWalletAddress(walletAddress, "wallet");
  const db = await readOfferDb();
  return sortByUpdatedAtDesc(
    db.offers.filter(
      (offer) =>
        offer.brandWallet.toLowerCase() === normalizedWallet.toLowerCase() ||
        offer.creatorWallet.toLowerCase() === normalizedWallet.toLowerCase()
    )
  );
}

export async function createOffer(input: CreateOfferInput): Promise<NegotiationOffer> {
  const brandWallet = ensureWalletAddress(input.brandWallet, "brandWallet");
  const creatorWallet = ensureWalletAddress(input.creatorWallet, "creatorWallet");
  if (brandWallet === creatorWallet) {
    throw new Error("brandWallet and creatorWallet cannot be the same.");
  }

  const campaignHeadline = input.campaignHeadline.trim();
  const deliverables = input.deliverables.trim();
  const timeline = input.timeline.trim();
  if (!campaignHeadline) {
    throw new Error("campaignHeadline is required.");
  }
  if (!deliverables) {
    throw new Error("deliverables is required.");
  }
  if (!timeline) {
    throw new Error("timeline is required.");
  }

  const agencyFeeBps = Math.floor(Number(input.agencyFeeBps));
  if (!Number.isInteger(agencyFeeBps) || agencyFeeBps < 0 || agencyFeeBps > 3000) {
    throw new Error("agencyFeeBps must be an integer between 0 and 3000.");
  }

  const budgetBNB = normalizeBudget(input.budgetBNB);
  const milestonesBNB = normalizeMilestones(input.milestonesBNB);
  const note = (input.note ?? "").trim();
  const now = new Date().toISOString();

  const offer: NegotiationOffer = {
    id: createOfferId(),
    brandWallet,
    creatorWallet,
    campaignHeadline,
    deliverables,
    timeline,
    agencyFeeBps,
    status: "pending_creator",
    currentBudgetBNB: budgetBNB,
    currentMilestonesBNB: milestonesBNB,
    currentNote: note,
    history: [
      makeHistoryEntry({
        type: "brand_offer",
        actorWallet: brandWallet,
        budgetBNB,
        milestonesBNB,
        note
      })
    ],
    createdAt: now,
    updatedAt: now
  };

  const db = await readOfferDb();
  db.offers.push(offer);
  await writeOfferDb(db);
  return offer;
}

export async function counterOffer(input: CounterOfferInput): Promise<NegotiationOffer> {
  const offerId = normalizeOfferId(input.offerId);
  const actorWallet = ensureWalletAddress(input.actorWallet, "actorWallet");
  const budgetBNB = normalizeBudget(input.budgetBNB);
  const milestonesBNB = normalizeMilestones(input.milestonesBNB);
  const note = (input.note ?? "").trim();

  const db = await readOfferDb();
  const offer = db.offers.find((row) => row.id === offerId);
  if (!offer) {
    throw new Error("Offer not found.");
  }
  ensureCanUpdateStatus(offer.status);
  if (offer.creatorWallet.toLowerCase() !== actorWallet.toLowerCase()) {
    throw new Error("Only the creator can submit a counter offer.");
  }

  offer.status = "countered";
  offer.currentBudgetBNB = budgetBNB;
  offer.currentMilestonesBNB = milestonesBNB;
  offer.currentNote = note;
  offer.updatedAt = new Date().toISOString();
  offer.history.push(
    makeHistoryEntry({
      type: "creator_counter",
      actorWallet,
      budgetBNB,
      milestonesBNB,
      note
    })
  );

  await writeOfferDb(db);
  return offer;
}

export async function acceptOffer(input: AcceptOfferInput): Promise<NegotiationOffer> {
  const offerId = normalizeOfferId(input.offerId);
  const actorWallet = ensureWalletAddress(input.actorWallet, "actorWallet");
  const note = (input.note ?? "").trim();

  const db = await readOfferDb();
  const offer = db.offers.find((row) => row.id === offerId);
  if (!offer) {
    throw new Error("Offer not found.");
  }
  ensureCanUpdateStatus(offer.status);
  if (offer.brandWallet.toLowerCase() !== actorWallet.toLowerCase()) {
    throw new Error("Only the brand can accept an offer.");
  }

  offer.status = "accepted";
  offer.updatedAt = new Date().toISOString();
  offer.history.push(
    makeHistoryEntry({
      type: "brand_accept",
      actorWallet,
      budgetBNB: offer.currentBudgetBNB,
      milestonesBNB: offer.currentMilestonesBNB,
      note
    })
  );

  await writeOfferDb(db);
  return offer;
}

export async function declineOffer(input: DeclineOfferInput): Promise<NegotiationOffer> {
  const offerId = normalizeOfferId(input.offerId);
  const actorWallet = ensureWalletAddress(input.actorWallet, "actorWallet");
  const note = (input.note ?? "").trim();

  const db = await readOfferDb();
  const offer = db.offers.find((row) => row.id === offerId);
  if (!offer) {
    throw new Error("Offer not found.");
  }
  ensureCanUpdateStatus(offer.status);
  if (
    offer.brandWallet.toLowerCase() !== actorWallet.toLowerCase() &&
    offer.creatorWallet.toLowerCase() !== actorWallet.toLowerCase()
  ) {
    throw new Error("Only campaign parties can decline an offer.");
  }

  offer.status = "declined";
  offer.updatedAt = new Date().toISOString();
  offer.history.push(
    makeHistoryEntry({
      type: actorWallet.toLowerCase() === offer.brandWallet.toLowerCase() ? "brand_decline" : "creator_decline",
      actorWallet,
      budgetBNB: offer.currentBudgetBNB,
      milestonesBNB: offer.currentMilestonesBNB,
      note
    })
  );

  await writeOfferDb(db);
  return offer;
}

