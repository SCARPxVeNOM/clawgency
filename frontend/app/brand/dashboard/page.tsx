"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  Plus, Wallet, CheckCircle2, ChevronUp,
  BarChart3, Coins, Zap, Building2, Sparkles, Send, Lock, Handshake, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { CampaignCard } from "@/components/CampaignCard";
import { BnbValue } from "@/components/BnbValue";
import { ContractButton } from "@/components/ContractButton";
import { RoleGuard } from "@/components/RoleGuard";
import { useSession } from "@/context/SessionContext";
import { fetchAllCampaigns, subscribeCampaignEvents, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import { useContractActions } from "@/lib/useContractActions";
import type { Workflow1Response } from "@/types/agent";
import type { NegotiationOffer } from "@/types/offers";

function parseMilestoneCsv(csv: string): string[] {
  return csv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function offerStatusLabel(status: NegotiationOffer["status"]): string {
  switch (status) {
    case "pending_creator":
      return "Pending Creator";
    case "countered":
      return "Countered";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

function offerStatusStyle(status: NegotiationOffer["status"]) {
  if (status === "accepted") {
    return { color: "#10b981", background: "rgba(16,185,129,0.12)" };
  }
  if (status === "countered") {
    return { color: "#6366f1", background: "rgba(99,102,241,0.12)" };
  }
  if (status === "declined") {
    return { color: "#ef4444", background: "rgba(239,68,68,0.12)" };
  }
  return { color: "#f59e0b", background: "rgba(245,158,11,0.12)" };
}

export default function BrandDashboardPage() {
  const { walletAddress } = useSession();
  const actions = useContractActions();

  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(true);

  // Form States
  const [influencer, setInfluencer] = useState("");
  const [milestonesCsv, setMilestonesCsv] = useState("0.02,0.015,0.015");
  const [agencyFeeBps, setAgencyFeeBps] = useState("500");
  const [depositCampaignId, setDepositCampaignId] = useState("");

  // AI Draft States
  const [draftHeadline, setDraftHeadline] = useState("Need fitness influencer");
  const [draftBudgetBnb, setDraftBudgetBnb] = useState("0.05");
  const [draftDeliverables, setDraftDeliverables] = useState("Instagram reel + TikTok");
  const [draftTimeline, setDraftTimeline] = useState("3 days");
  const draftBrandAddr = "0x1111111111111111111111111111111111111111";
  const [draftResult, setDraftResult] = useState<Workflow1Response | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [isDraftAppliedToForm, setIsDraftAppliedToForm] = useState(false);
  const [offers, setOffers] = useState<NegotiationOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerCreateLoading, setOfferCreateLoading] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [appliedNegotiationOfferId, setAppliedNegotiationOfferId] = useState<string | null>(null);

  const [offerCreatorWallet, setOfferCreatorWallet] = useState("");
  const [offerBudgetBnb, setOfferBudgetBnb] = useState("0.05");
  const [offerMilestonesCsv, setOfferMilestonesCsv] = useState("0.02,0.015,0.015");
  const [offerNote, setOfferNote] = useState("");

  const loadCampaigns = useCallback(async (options?: { background?: boolean }) => {
    const isBackgroundRefresh = options?.background === true;

    if (!isContractConfigured || !walletAddress) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    if (!isBackgroundRefresh) {
      setLoading(true);
    }

    try {
      const all = await fetchAllCampaigns();
      setCampaigns(all.filter((c) => c.brand.toLowerCase() === walletAddress.toLowerCase()));
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    void loadCampaigns();
    const stopWatching = subscribeCampaignEvents(() => { void loadCampaigns({ background: true }); });
    const interval = setInterval(() => void loadCampaigns({ background: true }), 12_000);
    return () => { stopWatching(); clearInterval(interval); };
  }, [loadCampaigns]);

  const loadOffers = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackgroundRefresh = options?.background === true;
      if (!walletAddress) {
        setOffers([]);
        setOffersLoading(false);
        return;
      }

      if (!isBackgroundRefresh) {
        setOffersLoading(true);
      }

      try {
        const response = await fetch(`/api/offers?wallet=${walletAddress}`, {
          method: "GET",
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => null)) as { offers?: NegotiationOffer[]; error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load negotiations.");
        }
        setOffers(Array.isArray(payload?.offers) ? payload?.offers : []);
      } catch (error) {
        if (!isBackgroundRefresh) {
          const message = error instanceof Error ? error.message : "Failed to load negotiations.";
          toast.error(message);
        }
      } finally {
        if (!isBackgroundRefresh) {
          setOffersLoading(false);
        }
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    void loadOffers();
    const interval = setInterval(() => void loadOffers({ background: true }), 15_000);
    return () => clearInterval(interval);
  }, [loadOffers]);

  const depositCandidateCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.state !== 2 && campaign.state !== 3),
    [campaigns]
  );

  const summary = useMemo(() => {
    const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.totalMilestoneAmount, 0n);
    const totalEscrowed = campaigns.reduce((sum, campaign) => sum + campaign.totalEscrowed, 0n);
    const releaseReady = campaigns.filter((campaign) => campaign.milestones.some((m) => m.approved && !m.paid)).length;
    return { totalBudget, totalEscrowed, activeCampaigns: depositCandidateCampaigns.length, releaseReady };
  }, [campaigns, depositCandidateCampaigns.length]);

  const milestoneInput = useMemo(() => {
    const parts = milestonesCsv.split(",").map((v) => v.trim()).filter(Boolean);
    if (parts.length === 0) return { milestones: [] as bigint[], total: 0n, error: "Enter at least one milestone amount." };
    const milestones: bigint[] = [];
    let total = 0n;
    for (let i = 0; i < parts.length; i++) {
      let wei: bigint;
      try { wei = parseEther(parts[i]); } catch { return { milestones: [] as bigint[], total: 0n, error: `Milestone ${i + 1} is invalid.` }; }
      if (wei <= 0n) return { milestones: [] as bigint[], total: 0n, error: `Milestone ${i + 1} must be > 0.` };
      milestones.push(wei);
      total += wei;
    }
    return { milestones, total, error: "" };
  }, [milestonesCsv]);

  const agencyFeeInputValid = useMemo(() => {
    const parsed = Number(agencyFeeBps);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 3000;
  }, [agencyFeeBps]);

  const baseCreateValidationError = useMemo(() => {
    if (!walletAddress) return "Connect wallet first.";
    if (milestoneInput.error) return milestoneInput.error;
    if (!influencer.startsWith("0x") || influencer.length !== 42) return "Enter a valid influencer address.";
    if (!agencyFeeInputValid) return "Agency fee must be an integer between 0 and 3000 bps.";
    return "";
  }, [walletAddress, milestoneInput.error, influencer, agencyFeeInputValid]);

  const negotiationReady = useMemo(() => {
    if (!appliedNegotiationOfferId) {
      return false;
    }
    return offers.some((offer) => offer.id === appliedNegotiationOfferId && offer.status === "accepted");
  }, [appliedNegotiationOfferId, offers]);

  const openNegotiationCount = useMemo(
    () => offers.filter((offer) => offer.status === "pending_creator" || offer.status === "countered").length,
    [offers]
  );

  const aiGateError = useMemo(() => {
    if (negotiationReady) return "";
    if (!draftResult) return "Generate AI proposal or accept creator counter offer first.";
    if (!isDraftAppliedToForm) return "Apply AI proposal to contract form first.";
    return "";
  }, [draftResult, isDraftAppliedToForm, negotiationReady]);

  const contractUnlocked = negotiationReady || Boolean(draftResult && isDraftAppliedToForm);

  const createDisabledReason = baseCreateValidationError || aiGateError;
  const createDisabled = Boolean(createDisabledReason);

  const createNegotiationOffer = async () => {
    if (!walletAddress) {
      toast.error("Connect wallet first.");
      return;
    }
    if (!offerCreatorWallet.startsWith("0x") || offerCreatorWallet.length !== 42) {
      toast.error("Enter a valid creator wallet address.");
      return;
    }
    const milestoneList = parseMilestoneCsv(offerMilestonesCsv);
    if (milestoneList.length === 0) {
      toast.error("Add at least one milestone for negotiation.");
      return;
    }
    if (!milestoneList.every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
      toast.error("Milestones must be positive number values.");
      return;
    }
    if (!Number.isFinite(Number(offerBudgetBnb)) || Number(offerBudgetBnb) <= 0) {
      toast.error("Offer budget must be a positive number.");
      return;
    }
    if (!agencyFeeInputValid) {
      toast.error("Agency fee must be between 0 and 3000 bps.");
      return;
    }

    setOfferCreateLoading(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandWallet: walletAddress,
          creatorWallet: offerCreatorWallet,
          campaignHeadline: draftHeadline,
          deliverables: draftDeliverables,
          timeline: draftTimeline,
          agencyFeeBps: Number(agencyFeeBps),
          budgetBNB: offerBudgetBnb,
          milestonesBNB: milestoneList,
          note: offerNote
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to send offer.");
      }
      toast.success("Offer sent to creator for negotiation.");
      setOfferNote("");
      await loadOffers({ background: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send offer.");
    } finally {
      setOfferCreateLoading(false);
    }
  };

  const applyAcceptedOfferToForm = (offer: NegotiationOffer) => {
    setInfluencer(offer.creatorWallet);
    setMilestonesCsv(offer.currentMilestonesBNB.join(","));
    setAgencyFeeBps(String(offer.agencyFeeBps));
    setOfferCreatorWallet(offer.creatorWallet);
    setOfferBudgetBnb(offer.currentBudgetBNB);
    setOfferMilestonesCsv(offer.currentMilestonesBNB.join(","));
    setDraftHeadline(offer.campaignHeadline);
    setDraftDeliverables(offer.deliverables);
    setDraftTimeline(offer.timeline);
    setDraftBudgetBnb(offer.currentBudgetBNB);
    setAppliedNegotiationOfferId(offer.id);
    setIsDraftAppliedToForm(false);
    toast.success("Accepted offer applied to contract form.");
  };

  const acceptCounterOffer = async (offerId: string) => {
    if (!walletAddress) {
      toast.error("Connect wallet first.");
      return;
    }
    setAcceptingOfferId(offerId);
    try {
      const response = await fetch(`/api/offers/${offerId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandWallet: walletAddress
        })
      });
      const payload = (await response.json().catch(() => null)) as { offer?: NegotiationOffer; error?: string } | null;
      if (!response.ok || !payload?.offer) {
        throw new Error(payload?.error ?? "Failed to accept offer.");
      }

      const accepted = payload.offer;
      applyAcceptedOfferToForm(accepted);
      await loadOffers({ background: true });
      toast.success("Counter offer accepted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept offer.");
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const declineNegotiationOffer = async (offerId: string) => {
    if (!walletAddress) {
      toast.error("Connect wallet first.");
      return;
    }
    setAcceptingOfferId(offerId);
    try {
      const response = await fetch(`/api/offers/${offerId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorWallet: walletAddress
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to decline offer.");
      }
      await loadOffers({ background: true });
      toast.success("Offer declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline offer.");
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const sendProposalEmail = async (campaignId: bigint) => {
    const campaignDetails = [
      `Deliverables: ${draftDeliverables}`,
      `Timeline: ${draftTimeline}`,
      `Milestones (BNB): ${milestonesCsv}`,
      `Agency fee (bps): ${agencyFeeBps}`
    ].join("\n");

    const ctaUrl = `${window.location.origin}/influencer/dashboard?campaignId=${campaignId.toString()}`;

    const response = await fetch("/api/campaigns/proposal-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaignId.toString(),
        brandWallet: walletAddress,
        influencerWallet: influencer,
        campaignTitle: draftHeadline,
        campaignDetails,
        budgetBNB: formatEther(milestoneInput.total),
        ctaUrl
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to send proposal email.");
    }
  };

  const handleCreate = async () => {
    if (createDisabledReason) return toast.error(createDisabledReason);

    const previousLatestCampaignId = campaigns.reduce((maxId, campaign) => (campaign.id > maxId ? campaign.id : maxId), 0n);

    await actions.createCampaign(
      walletAddress as `0x${string}`,
      influencer as `0x${string}`,
      milestoneInput.milestones,
      Number(agencyFeeBps)
    );

    const allCampaigns = await fetchAllCampaigns();
    const ownCampaigns = allCampaigns.filter((campaign) => campaign.brand.toLowerCase() === walletAddress?.toLowerCase());
    setCampaigns(ownCampaigns);

    const createdCampaign =
      ownCampaigns
        .filter((campaign) => campaign.id > previousLatestCampaignId)
        .sort((a, b) => Number(b.id - a.id))[0] ??
      ownCampaigns.sort((a, b) => Number(b.id - a.id))[0];

    if (createdCampaign) {
      setDepositCampaignId(createdCampaign.id.toString());
      try {
        await sendProposalEmail(createdCampaign.id);
        toast.success("Campaign created and proposal email sent to creator.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Proposal email failed.";
        toast.error(`Campaign created, but email failed: ${message}`);
      }
    }

    setIsCreateOpen(false);
    setIsDraftAppliedToForm(false);
    setAppliedNegotiationOfferId(null);
  };

  const handleDrafting = async () => {
    setDraftLoading(true);
    setDraftResult(null);
    setIsDraftAppliedToForm(false);
    setAppliedNegotiationOfferId(null);

    try {
      const res = await fetch("/api/agent/workflow1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: draftHeadline,
          budgetBNB: draftBudgetBnb,
          deliverables: draftDeliverables,
          timeline: draftTimeline,
          brandAddr: walletAddress || draftBrandAddr
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Drafting failed");
      setDraftResult(data as Workflow1Response);
      toast.success("AI Proposal Generated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Drafting failed");
    } finally {
      setDraftLoading(false);
    }
  };

  const applyDraftToForm = () => {
    if (!draftResult) return;
    const [, influencerAddr, milestonesWei, feeBps] = draftResult.transactionProposal.params;
    const milestonesBnbCsv = milestonesWei.map((value) => formatEther(BigInt(value))).join(",");
    const totalBudget = milestonesWei.reduce((sum, value) => sum + BigInt(value), 0n);
    setInfluencer(influencerAddr);
    setMilestonesCsv(milestonesBnbCsv);
    setAgencyFeeBps(String(feeBps));
    setOfferCreatorWallet(influencerAddr);
    setOfferMilestonesCsv(milestonesBnbCsv);
    setOfferBudgetBnb(formatEther(totalBudget));
    setIsDraftAppliedToForm(true);
    setAppliedNegotiationOfferId(null);
    toast.success("AI proposal applied to form");
  };

  useEffect(() => {
    if (depositCandidateCampaigns.length > 0 && !depositCampaignId) {
      setDepositCampaignId(depositCandidateCampaigns[0].id.toString());
    }
  }, [depositCandidateCampaigns, depositCampaignId]);

  /* Shared input style */
  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/60 border border-gray-200 text-sm text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]";
  const labelClass = "block text-[11px] font-body font-bold uppercase tracking-widest text-gray-400 mb-1.5";

  /* Stats config */
  const stats = [
    { label: "Active", value: summary.activeCampaigns.toString(), icon: BarChart3, color: "#6366f1", bg: "rgba(99,102,241,0.08)", isBnb: false },
    { label: "Budget", value: `${formatEther(summary.totalBudget)} BNB`, icon: Coins, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", isBnb: true },
    { label: "Escrowed", value: `${formatEther(summary.totalEscrowed)} BNB`, icon: Wallet, color: "#10b981", bg: "rgba(16,185,129,0.08)", isBnb: true },
    { label: "Ready", value: summary.releaseReady.toString(), icon: Zap, color: summary.releaseReady > 0 ? "#f59e0b" : "#9ca3af", bg: summary.releaseReady > 0 ? "rgba(245,158,11,0.08)" : "rgba(0,0,0,0.03)", isBnb: false },
  ];

  return (
    <RoleGuard allow={["brand"]}>
      <div className="space-y-8">

        {/* Header */}
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-2xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))" }}
            >
              <Building2 size={24} className="text-indigo-600" strokeWidth={1.8} />
              <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 0 1px rgba(99,102,241,0.15)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent">
                Brand Dashboard
              </h1>
              <p className="text-xs font-body text-gray-400 font-medium mt-0.5 tracking-wide">
                Manage campaigns &amp; escrow
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-body font-bold transition-all duration-200 hover:shadow-md"
            style={{
              background: isCreateOpen
                ? "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))"
                : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
              color: isCreateOpen ? "#ef4444" : "#6366f1",
              border: `1px solid ${isCreateOpen ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)"}`,
            }}
          >
            {isCreateOpen ? (
              <><ChevronUp size={16} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" /> Close</>
            ) : (
              <><Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" /> New Campaign</>
            )}
          </button>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:shadow-glass-hover transition-all duration-300 hover:-translate-y-0.5"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 h-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
                />
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center ring-1 ring-inset"
                    style={{ background: s.bg, boxShadow: `0 0 12px ${s.color}15` }}
                  >
                    <Icon size={16} strokeWidth={2} style={{ color: s.color }} />
                  </div>
                  <p className="text-[10px] font-body font-bold uppercase tracking-[0.15em] text-gray-400">
                    {s.label}
                  </p>
                </div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {s.isBnb ? <BnbValue amount={s.value} /> : s.value}
                </p>
              </div>
            );
          })}
        </section>

        <section
          className="rounded-3xl p-[1px] overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.1), rgba(139,92,246,0.12))" }}
        >
          <div className="glass-card rounded-3xl p-6 md:p-8 border-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.08))" }}
                >
                  <Handshake size={18} className="text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-bold text-gray-900">Offer Negotiation</h2>
                  <p className="text-[11px] text-gray-400">Send offers, review creator counters, and accept final pricing.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wide">
                Open: {openNegotiationCount}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Creator Wallet</label>
                  <input
                    className={`${inputClass} font-mono`}
                    placeholder="0x..."
                    value={offerCreatorWallet}
                    onChange={(event) => setOfferCreatorWallet(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Offer Budget (BNB)</label>
                    <input
                      className={inputClass}
                      placeholder="0.05"
                      value={offerBudgetBnb}
                      onChange={(event) => setOfferBudgetBnb(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Milestones (CSV)</label>
                    <input
                      className={`${inputClass} font-mono`}
                      placeholder="0.02,0.015,0.015"
                      value={offerMilestonesCsv}
                      onChange={(event) => setOfferMilestonesCsv(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Negotiation Note</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="Optional note for creator (terms, urgency, scope adjustments)"
                    value={offerNote}
                    onChange={(event) => setOfferNote(event.target.value)}
                  />
                </div>
                <button
                  onClick={() => void createNegotiationOffer()}
                  disabled={offerCreateLoading}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-body font-bold text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/20"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  {offerCreateLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending Offer...
                    </>
                  ) : (
                    <>
                      <Handshake size={15} />
                      Send Offer For Negotiation
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3 md:border-l md:border-gray-100/80 md:pl-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Recent Negotiations</p>
                {offersLoading ? (
                  <div className="rounded-xl border border-gray-100 bg-white/60 p-4 text-sm text-gray-500">Loading offers...</div>
                ) : offers.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-white/60 p-4 text-sm text-gray-500">
                    No offers yet. Send your first pricing offer to start negotiation.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {offers.map((offer) => {
                      const statusStyle = offerStatusStyle(offer.status);
                      const isApplying = acceptingOfferId === offer.id;
                      const canAcceptCounter = offer.status === "countered";
                      const canDecline = offer.status === "pending_creator" || offer.status === "countered";

                      return (
                        <div key={offer.id} className="rounded-xl border border-gray-100 bg-white/65 p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-gray-800">{offer.campaignHeadline}</p>
                              <p className="text-[11px] font-mono text-gray-500">{offer.creatorWallet}</p>
                            </div>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                              style={statusStyle}
                            >
                              {offerStatusLabel(offer.status)}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-600">
                            Budget: <span className="font-bold">{offer.currentBudgetBNB} BNB</span> | Milestones:{" "}
                            <span className="font-mono">{offer.currentMilestonesBNB.join(",")}</span>
                          </p>
                          {offer.currentNote ? <p className="text-[11px] text-gray-500">{offer.currentNote}</p> : null}

                          <div className="flex flex-wrap gap-2">
                            {canAcceptCounter ? (
                              <button
                                onClick={() => void acceptCounterOffer(offer.id)}
                                disabled={isApplying}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                              >
                                {isApplying ? <Loader2 size={12} className="animate-spin" /> : null}
                                Accept Counter
                              </button>
                            ) : null}

                            {offer.status === "accepted" ? (
                              <button
                                onClick={() => applyAcceptedOfferToForm(offer)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                              >
                                Use In Contract Form
                              </button>
                            ) : null}

                            {canDecline ? (
                              <button
                                onClick={() => void declineNegotiationOffer(offer.id)}
                                disabled={isApplying}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Create Campaign Panel */}
        {isCreateOpen && (
          <section
            className="rounded-3xl p-[1px] overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1), rgba(16,185,129,0.1))" }}
          >
            <div className="glass-card rounded-3xl p-6 md:p-8 border-0">
              <div className="grid md:grid-cols-2 gap-8">

                {/* Left: AI Brief */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.08))" }}
                      >
                        <Sparkles size={18} strokeWidth={2} className="text-purple-500" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                        1
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-heading font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
                        AI Brief
                      </h3>
                      <p className="text-[10px] font-body text-gray-400">Let AI analyze your campaign</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Headline</label>
                    <input className={inputClass} placeholder="e.g. Need fitness influencer" value={draftHeadline} onChange={(e) => setDraftHeadline(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Budget (BNB)</label>
                      <input className={inputClass} placeholder="1.0" value={draftBudgetBnb} onChange={(e) => setDraftBudgetBnb(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Timeline</label>
                      <input className={inputClass} placeholder="3 days" value={draftTimeline} onChange={(e) => setDraftTimeline(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Deliverables</label>
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={3}
                      placeholder="Instagram reel + TikTok"
                      value={draftDeliverables}
                      onChange={(e) => setDraftDeliverables(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => void handleDrafting()}
                    disabled={draftLoading}
                    className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-body font-bold text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1, #4f46e5)" }}
                  >
                    {draftLoading ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Analyzing...</>
                    ) : (
                      <><Sparkles size={15} /> Generate AI Proposal</>
                    )}
                  </button>

                  {draftResult && (
                    <div
                      className="rounded-xl p-4 space-y-3 ring-1 ring-inset ring-emerald-200/60"
                      style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))" }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-body font-bold text-emerald-700">
                          AI Analysis Complete - Confidence {draftResult.confidence.milestonePlan}/10
                        </span>
                      </div>
                      <p className="text-xs font-body text-emerald-800 leading-relaxed pl-8">{draftResult.brandIntent}</p>
                      <button
                        onClick={applyDraftToForm}
                        className="w-full flex items-center justify-center gap-2 rounded-lg text-white text-xs font-bold py-2.5 transition-all hover:shadow-md hover:shadow-emerald-500/20 hover:-translate-y-0.5"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        <CheckCircle2 size={13} /> Apply Proposal To Form
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Contract Form */}
                <div className="space-y-5 md:border-l md:border-gray-100/80 md:pl-8">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))" }}
                      >
                        <Wallet size={18} strokeWidth={2} className="text-indigo-500" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                        2
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-heading font-bold bg-gradient-to-r from-indigo-700 to-violet-600 bg-clip-text text-transparent">
                        Smart Contract
                      </h3>
                      <p className="text-[10px] font-body text-gray-400">Deploy on BNB Chain</p>
                    </div>
                  </div>

                  {!contractUnlocked ? (
                    <div
                      className="rounded-xl border px-3.5 py-3 flex items-start gap-2"
                      style={{
                        borderColor: "rgba(245,158,11,0.25)",
                        background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.04))"
                      }}
                    >
                      <Lock size={14} className="text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">AI-Gated Creation</p>
                        <p className="text-xs text-amber-800 mt-1">Generate/apply AI proposal or accept a creator counter offer before creating on-chain campaign.</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl border px-3.5 py-3 flex items-start gap-2"
                      style={{
                        borderColor: "rgba(16,185,129,0.3)",
                        background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))"
                      }}
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Proposal Ready</p>
                        <p className="text-xs text-emerald-800 mt-1">Smart contract deployment is unlocked via AI brief or accepted negotiation.</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Influencer Address</label>
                    <input className={`${inputClass} font-mono`} placeholder="Influencer wallet" value={influencer} onChange={(e) => setInfluencer(e.target.value)} />
                  </div>

                  <div>
                    <label className={labelClass}>Milestones (BNB)</label>
                    <input className={`${inputClass} font-mono`} placeholder="Milestones in BNB, comma-separated" value={milestonesCsv} onChange={(e) => setMilestonesCsv(e.target.value)} />
                    <p className="text-[10px] font-body text-gray-400 mt-1.5 flex items-center gap-1">
                      Total: <BnbValue amount={`${formatEther(milestoneInput.total)} BNB`} className="font-semibold text-gray-600" />
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Agency Fee (BPS)</label>
                    <input className={`${inputClass} font-mono`} placeholder="Agency fee in bps (e.g. 500)" value={agencyFeeBps} onChange={(e) => setAgencyFeeBps(e.target.value)} />
                    {agencyFeeInputValid && Number(agencyFeeBps) > 0 && (
                      <p className="text-[10px] font-body text-gray-400 mt-1">{(Number(agencyFeeBps) / 100).toFixed(1)}% fee</p>
                    )}
                  </div>

                  <ContractButton
                    label={createDisabled ? "Create On-Chain Campaign (Locked)" : "Create On-Chain Campaign"}
                    confirmTitle="Confirm Creation"
                    confirmMessage={`Create campaign for ${formatEther(milestoneInput.total)} BNB?`}
                    onExecute={async () => { await handleCreate(); }}
                    disabled={createDisabled}
                    className="w-full font-bold"
                    size="lg"
                    color="primary"
                  />

                  {createDisabledReason ? (
                    <p className="text-[11px] font-body text-amber-700">{createDisabledReason}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Campaign List */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-heading font-bold text-gray-900">Your Campaigns</h2>
              <span
                className="text-[10px] font-body font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}
              >
                {campaigns.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="glass-card rounded-3xl p-16 text-center">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))" }}
              >
                <div className="animate-spin w-6 h-6 border-[2.5px] border-indigo-200 border-t-indigo-500 rounded-full" />
              </div>
              <p className="text-sm font-body font-medium text-gray-400">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div
              className="glass-card rounded-3xl p-16 text-center relative overflow-hidden"
              style={{ border: "1.5px dashed rgba(99,102,241,0.2)" }}
            >
              <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08), transparent 60%)" }} />
              <div className="relative">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))" }}
                >
                  <Send size={26} className="text-indigo-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-sm font-body text-gray-400 mb-6 max-w-[280px] mx-auto leading-relaxed">
                  Create your first campaign to start managing influencer partnerships on-chain.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-body font-bold transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", color: "#6366f1" }}
                >
                  <Plus size={15} strokeWidth={2.5} /> Create Campaign
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              {campaigns.map((c) => {
                const pendingApprovalMilestone = c.milestones.find(
                  (m) => !m.paid && !m.approved && m.proofHash.length > 0
                );
                const releasableAmount = c.milestones.reduce((sum, m) => (m.approved && !m.paid ? sum + m.amount : sum), 0n);

                return (
                  <div
                    key={c.id.toString()}
                    className="glass-card rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-glass-hover hover:-translate-y-0.5"
                  >
                    <CampaignCard
                      campaign={c}
                      actionSlot={
                        <div className="flex flex-wrap gap-2 w-full justify-end">
                          {c.totalEscrowed < c.totalMilestoneAmount && (
                            <ContractButton
                              label="Deposit"
                              confirmTitle="Fund Escrow"
                              confirmMessage="Deposit remaining funds?"
                              onExecute={async () => {
                                const remaining = c.totalMilestoneAmount - c.totalEscrowed;
                                await actions.depositFunds(c.id, formatEther(remaining));
                                await loadCampaigns({ background: true });
                              }}
                              variant="flat"
                              color="default"
                              size="sm"
                            />
                          )}
                          {pendingApprovalMilestone && (
                            <ContractButton
                              label={`Approve M${Number(pendingApprovalMilestone.index) + 1}`}
                              confirmTitle="Approve Milestone"
                              confirmMessage={`Approve milestone ${Number(pendingApprovalMilestone.index) + 1} for payout eligibility?`}
                              onExecute={async () => {
                                await actions.approveMilestone(c.id, pendingApprovalMilestone.index);
                                await loadCampaigns({ background: true });
                              }}
                              color="primary"
                              variant="flat"
                              size="sm"
                            />
                          )}
                          <ContractButton
                            label="Release"
                            confirmTitle="Release Funds"
                            confirmMessage={
                              releasableAmount > 0n
                                ? `Release ${formatEther(releasableAmount)} BNB across approved milestones?`
                                : "Attempt release now? If nothing is approved yet, the transaction will fail with a clear reason."
                            }
                            onExecute={async () => {
                              await actions.releaseFunds(c.id);
                              await loadCampaigns({ background: true });
                            }}
                            disabled={c.state === 2 || c.state === 3}
                            color="success"
                            variant="shadow"
                            size="sm"
                            className="text-white font-bold"
                          />
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}

