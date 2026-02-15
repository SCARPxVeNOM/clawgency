"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock, AlertCircle, CheckCircle, Sparkles, FileCheck, Upload, Zap, Handshake, Loader2 } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { ContractButton } from "@/components/ContractButton";
import { ProofUploader } from "@/components/ProofUploader";
import { RoleGuard } from "@/components/RoleGuard";
import { useSession } from "@/context/SessionContext";
import { fetchAllCampaigns, subscribeCampaignEvents, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import { useContractActions } from "@/lib/useContractActions";
import type { Workflow2Response } from "@/types/agent";
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

export default function InfluencerDashboardPage() {
  const { walletAddress } = useSession();
  const actions = useContractActions();
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<NegotiationOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerActionId, setOfferActionId] = useState<string | null>(null);
  const [counterBudgetByOffer, setCounterBudgetByOffer] = useState<Record<string, string>>({});
  const [counterMilestonesByOffer, setCounterMilestonesByOffer] = useState<Record<string, string>>({});
  const [counterNoteByOffer, setCounterNoteByOffer] = useState<Record<string, string>>({});

  const loadCampaigns = useCallback(async (options?: { background?: boolean }) => {
    const isBackgroundRefresh = options?.background === true;

    if (!walletAddress || !isContractConfigured) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    if (!isBackgroundRefresh) {
      setLoading(true);
    }

    try {
      const all = await fetchAllCampaigns();
      setCampaigns(all.filter((c) => c.influencer.toLowerCase() === walletAddress.toLowerCase()));
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    void loadCampaigns();
    const stop = subscribeCampaignEvents(() => void loadCampaigns({ background: true }));
    const interval = setInterval(() => void loadCampaigns({ background: true }), 12_000);
    return () => {
      stop();
      clearInterval(interval);
    };
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
        setOffers(Array.isArray(payload?.offers) ? payload.offers : []);
      } catch (error) {
        if (!isBackgroundRefresh) {
          toast.error(error instanceof Error ? error.message : "Failed to load negotiations.");
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

  async function validateProof(campaignId: bigint, proofHash: string): Promise<Workflow2Response> {
    const response = await fetch("/api/agent/workflow2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignId: campaignId.toString(),
        proofHash,
        userId: walletAddress ?? "unknown_influencer",
        chainEventHash: "N/A"
      })
    });

    const payload = (await response.json()) as Workflow2Response | { error?: string };
    if (!response.ok) {
      throw new Error(payload && "error" in payload ? payload.error ?? "Proof validation failed." : "Proof validation failed.");
    }

    toast.success("AI proof validation completed.");
    return payload as Workflow2Response;
  }

  const campaignsNeedingProof = campaigns.filter((campaign) =>
    campaign.milestones.some((m) => !m.paid && !m.proofHash)
  ).length;

  const campaignsWaitingApproval = campaigns.filter((campaign) =>
    campaign.milestones.some((m) => !m.paid && m.proofHash && !m.approved)
  ).length;

  async function sendCompletionEmail(input: {
    campaignId: bigint;
    brandWallet: `0x${string}`;
    influencerWallet: `0x${string}`;
    proofHash: string;
    milestoneNumber: number;
  }) {
    const response = await fetch("/api/campaigns/completion-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignId: input.campaignId.toString(),
        brandWallet: input.brandWallet,
        influencerWallet: input.influencerWallet,
        proofHash: input.proofHash,
        milestoneNumber: input.milestoneNumber,
        campaignTitle: `Campaign #${input.campaignId.toString()}`
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to send completion email.");
    }
  }

  const openNegotiationCount = offers.filter((offer) => offer.status === "pending_creator" || offer.status === "countered").length;

  async function submitCounterOffer(offer: NegotiationOffer) {
    if (!walletAddress) {
      toast.error("Connect wallet first.");
      return;
    }

    const budget = (counterBudgetByOffer[offer.id] ?? offer.currentBudgetBNB).trim();
    const milestonesCsv = (counterMilestonesByOffer[offer.id] ?? offer.currentMilestonesBNB.join(",")).trim();
    const note = (counterNoteByOffer[offer.id] ?? "").trim();
    const milestoneList = parseMilestoneCsv(milestonesCsv);

    if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) {
      toast.error("Counter budget must be a positive number.");
      return;
    }
    if (milestoneList.length === 0 || !milestoneList.every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
      toast.error("Counter milestones must be positive number values.");
      return;
    }

    setOfferActionId(offer.id);
    try {
      const response = await fetch(`/api/offers/${offer.id}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorWallet: walletAddress,
          budgetBNB: budget,
          milestonesBNB: milestoneList,
          note
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to send counter offer.");
      }
      toast.success("Counter offer sent to brand.");
      await loadOffers({ background: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send counter offer.");
    } finally {
      setOfferActionId(null);
    }
  }

  async function declineNegotiationOffer(offerId: string) {
    if (!walletAddress) {
      toast.error("Connect wallet first.");
      return;
    }
    setOfferActionId(offerId);
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
      toast.success("Offer declined.");
      await loadOffers({ background: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline offer.");
    } finally {
      setOfferActionId(null);
    }
  }

  return (
    <RoleGuard allow={["influencer"]}>
      <div className="space-y-8 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <Sparkles size={18} className="text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-gray-900">Creator Hub</h1>
              <p className="text-xs font-body font-medium text-gray-400">Submit proofs & track milestones</p>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: <Clock size={15} strokeWidth={2.5} />,
              label: "Active Gigs",
              value: campaigns.length,
              color: "#6366f1",
              bg: "rgba(99,102,241,0.08)",
            },
            {
              icon: <AlertCircle size={15} strokeWidth={2.5} />,
              label: "Needs Proof",
              value: campaignsNeedingProof,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.08)",
            },
            {
              icon: <CheckCircle size={15} strokeWidth={2.5} />,
              label: "Pending",
              value: campaignsWaitingApproval,
              color: "#10b981",
              bg: "rgba(16,185,129,0.08)",
            },
            {
              icon: <Handshake size={15} strokeWidth={2.5} />,
              label: "Negotiations",
              value: openNegotiationCount,
              color: "#8b5cf6",
              bg: "rgba(139,92,246,0.08)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-5 space-y-3 hover:shadow-glass-hover transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: stat.bg, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <p className="text-[10px] font-body font-bold uppercase tracking-[0.15em] text-gray-400">
                  {stat.label}
                </p>
              </div>
              <p className="text-3xl font-heading font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* ── My Tasks ── */}
        <section
          className="rounded-3xl p-[1px] overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1), rgba(16,185,129,0.1))" }}
        >
          <div className="glass-card rounded-3xl p-6 border-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <Handshake size={15} className="text-violet-500" />
                </div>
                <div>
                  <h2 className="text-sm font-heading font-bold text-gray-900 uppercase tracking-wide">Offer Negotiation</h2>
                  <p className="text-[11px] font-body text-gray-400">Counter brand offers with your expected price and milestone split.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 uppercase tracking-wide">
                Open: {openNegotiationCount}
              </span>
            </div>

            {offersLoading ? (
              <div className="rounded-xl border border-gray-100 bg-white/60 p-4 text-sm text-gray-500">
                Loading negotiations...
              </div>
            ) : offers.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white/60 p-4 text-sm text-gray-500">
                No offers yet. Brand offers will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => {
                  const statusStyle = offerStatusStyle(offer.status);
                  const canCounter = offer.status === "pending_creator" || offer.status === "countered";
                  const isActing = offerActionId === offer.id;
                  const budgetValue = counterBudgetByOffer[offer.id] ?? offer.currentBudgetBNB;
                  const milestonesValue = counterMilestonesByOffer[offer.id] ?? offer.currentMilestonesBNB.join(",");
                  const noteValue = counterNoteByOffer[offer.id] ?? "";

                  return (
                    <article key={offer.id} className="rounded-2xl border border-gray-100 bg-white/65 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-heading font-bold text-gray-900">{offer.campaignHeadline}</p>
                          <p className="text-[11px] font-mono text-gray-500">Brand: {offer.brandWallet}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full" style={statusStyle}>
                          {offerStatusLabel(offer.status)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Current offer: <span className="font-bold text-gray-700">{offer.currentBudgetBNB} BNB</span> |
                        Milestones: <span className="font-mono"> {offer.currentMilestonesBNB.join(",")}</span>
                      </p>
                      {offer.currentNote ? <p className="text-xs text-gray-500">{offer.currentNote}</p> : null}

                      {canCounter ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className="w-full px-3 py-2 rounded-xl bg-white/70 border border-gray-200 text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all"
                            placeholder="Counter budget (BNB)"
                            value={budgetValue}
                            onChange={(event) =>
                              setCounterBudgetByOffer((prev) => ({ ...prev, [offer.id]: event.target.value }))
                            }
                          />
                          <input
                            className="w-full px-3 py-2 rounded-xl bg-white/70 border border-gray-200 text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all"
                            placeholder="Counter milestones CSV"
                            value={milestonesValue}
                            onChange={(event) =>
                              setCounterMilestonesByOffer((prev) => ({ ...prev, [offer.id]: event.target.value }))
                            }
                          />
                          <textarea
                            className="sm:col-span-2 w-full px-3 py-2 rounded-xl bg-white/70 border border-gray-200 text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all resize-none"
                            rows={2}
                            placeholder="Counter note (optional)"
                            value={noteValue}
                            onChange={(event) =>
                              setCounterNoteByOffer((prev) => ({ ...prev, [offer.id]: event.target.value }))
                            }
                          />
                          <div className="sm:col-span-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => void submitCounterOffer(offer)}
                              disabled={isActing}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
                            >
                              {isActing ? <Loader2 size={13} className="animate-spin" /> : null}
                              Send Counter Offer
                            </button>
                            <button
                              onClick={() => void declineNegotiationOffer(offer.id)}
                              disabled={isActing}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          {offer.status === "accepted"
                            ? "Brand accepted the final negotiated price."
                            : "Negotiation closed."}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
              <FileCheck size={13} className="text-indigo-500" />
            </div>
            <h2 className="text-sm font-heading font-bold text-gray-900 uppercase tracking-wide">My Tasks</h2>
          </div>

          {loading ? (
            <div className="glass-card rounded-2xl flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-body text-gray-400">Loading campaigns...</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="glass-card rounded-2xl text-center py-16 px-6">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.08)" }}>
                <Zap size={22} className="text-violet-400" />
              </div>
              <p className="text-base font-heading font-bold text-gray-700">No active campaigns</p>
              <p className="text-sm font-body text-gray-400 mt-1 max-w-xs mx-auto">
                When a brand assigns you a campaign, your tasks and milestones will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((c) => {
                const canDenyOffer = c.state !== 2 && c.state !== 3 && c.totalReleased === 0n;
                const proofSubmissionDisabled = c.state === 2 || c.state === 3;

                return (
                  <div key={c.id.toString()} className="space-y-3">
                    {/* Campaign Card */}
                    <div className="glass-card rounded-2xl overflow-hidden">
                      <CampaignCard
                        campaign={c}
                        actionSlot={
                          canDenyOffer ? (
                            <ContractButton
                              label="Deny Offer"
                              confirmTitle="Deny Campaign Offer"
                              confirmMessage="Deny this campaign offer? Escrowed funds will be refunded to the brand."
                              onExecute={async () => {
                                await actions.cancelCampaign(c.id);
                                await loadCampaigns({ background: true });
                                toast.success("Campaign offer denied.");
                              }}
                              color="danger"
                              variant="flat"
                              size="sm"
                            />
                          ) : undefined
                        }
                      />
                    </div>

                    {/* Proof Uploader */}
                    <div className="ml-5 pl-5 border-l-2 border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
                          <Upload size={11} className="text-indigo-500" />
                        </div>
                        <p className="text-[10px] font-body font-bold uppercase tracking-[0.15em] text-gray-400">
                          Submit Proof
                        </p>
                      </div>
                      <div className="glass-card rounded-xl p-4">
                        <ProofUploader
                          disabled={proofSubmissionDisabled}
                          onSubmit={async (hash) => {
                            const nextMilestone = c.milestones.find((milestone) => !milestone.paid && !milestone.proofHash);
                            const milestoneNumber = nextMilestone ? Number(nextMilestone.index) + 1 : 1;

                            await actions.submitProof(c.id, hash);
                            await loadCampaigns({ background: true });

                            try {
                              await sendCompletionEmail({
                                campaignId: c.id,
                                brandWallet: c.brand,
                                influencerWallet: c.influencer,
                                proofHash: hash,
                                milestoneNumber
                              });
                              toast.success("Proof submitted and brand notified by email.");
                            } catch (error) {
                              const message = error instanceof Error ? error.message : "Completion email failed.";
                              toast.error(`Proof submitted, but email failed: ${message}`);
                            }
                          }}
                          onValidate={(hash) => validateProof(c.id, hash)}
                        />
                      </div>
                    </div>
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




