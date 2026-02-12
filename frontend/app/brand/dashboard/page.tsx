"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  Plus, Wallet, CheckCircle2, ChevronUp,
  BarChart3, Coins, Zap, Building2, Sparkles, Send
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

export default function BrandDashboardPage() {
  const { walletAddress } = useSession();
  const actions = useContractActions();

  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(true);

  // Form States
  const [influencer, setInfluencer] = useState("");
  const [milestonesCsv, setMilestonesCsv] = useState("0.3,0.3,0.4");
  const [agencyFeeBps, setAgencyFeeBps] = useState("500");
  const [depositCampaignId, setDepositCampaignId] = useState("");

  // AI Draft States
  const [draftHeadline, setDraftHeadline] = useState("Need fitness influencer");
  const [draftBudgetBnb, setDraftBudgetBnb] = useState("1");
  const [draftDeliverables, setDraftDeliverables] = useState("Instagram reel + TikTok");
  const [draftTimeline, setDraftTimeline] = useState("3 days");
  const draftBrandAddr = "0x1111111111111111111111111111111111111111";
  const [draftResult, setDraftResult] = useState<Workflow1Response | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    if (!isContractConfigured || !walletAddress) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await fetchAllCampaigns();
      setCampaigns(all.filter((c) => c.brand.toLowerCase() === walletAddress.toLowerCase()));
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void loadCampaigns();
    const stopWatching = subscribeCampaignEvents(() => { void loadCampaigns(); });
    const interval = setInterval(() => void loadCampaigns(), 12_000);
    return () => { stopWatching(); clearInterval(interval); };
  }, [loadCampaigns]);

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

  const handleCreate = async () => {
    if (!walletAddress) return toast.error("Connect wallet first");
    if (milestoneInput.error) return toast.error(milestoneInput.error);
    if (!influencer.startsWith("0x") || influencer.length !== 42) return toast.error("Invalid influencer address");
    await actions.createCampaign(
      walletAddress as `0x${string}`,
      influencer as `0x${string}`,
      milestoneInput.milestones,
      Number(agencyFeeBps)
    );
    setIsCreateOpen(false);
  };

  const handleDrafting = async () => {
    setDraftLoading(true);
    setDraftResult(null);
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
    setInfluencer(influencerAddr);
    setMilestonesCsv(milestonesWei.map((value) => formatEther(BigInt(value))).join(","));
    setAgencyFeeBps(String(feeBps));
    toast.success("AI proposal applied to form");
  };

  useEffect(() => {
    if (depositCandidateCampaigns.length > 0 && !depositCampaignId) {
      setDepositCampaignId(depositCandidateCampaigns[0].id.toString());
    }
  }, [depositCandidateCampaigns, depositCampaignId]);

  /* ── Shared input style ── */
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-white/60 border border-gray-200 text-sm font-body text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all";
  const labelClass = "block text-[11px] font-body font-bold uppercase tracking-widest text-gray-400 mb-1.5";

  /* ── Stats config ── */
  const stats = [
    { label: "Active", value: summary.activeCampaigns.toString(), icon: BarChart3, color: "#6366f1", bg: "rgba(99,102,241,0.08)", isBnb: false },
    { label: "Budget", value: `${formatEther(summary.totalBudget)} BNB`, icon: Coins, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", isBnb: true },
    { label: "Escrowed", value: `${formatEther(summary.totalEscrowed)} BNB`, icon: Wallet, color: "#10b981", bg: "rgba(16,185,129,0.08)", isBnb: true },
    { label: "Ready", value: summary.releaseReady.toString(), icon: Zap, color: summary.releaseReady > 0 ? "#f59e0b" : "#9ca3af", bg: summary.releaseReady > 0 ? "rgba(245,158,11,0.08)" : "rgba(0,0,0,0.03)", isBnb: false },
  ];

  return (
    <RoleGuard allow={["brand"]}>
      <div className="space-y-8">

        {/* ════════ Header ════════ */}
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: "rgba(99,102,241,0.08)" }}>
              <Building2 size={22} className="text-indigo-500" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-gray-900 tracking-tight">Brand Dashboard</h1>
              <p className="text-sm font-body text-gray-400 font-medium mt-0.5">Manage campaigns & escrow</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-semibold transition-all"
            style={{
              background: isCreateOpen ? "rgba(239,68,68,0.08)" : "rgba(99,102,241,0.08)",
              color: isCreateOpen ? "#ef4444" : "#6366f1",
            }}
          >
            {isCreateOpen ? (
              <><ChevronUp size={16} strokeWidth={2.5} /> Close</>
            ) : (
              <><Plus size={16} strokeWidth={2.5} /> New Campaign</>
            )}
          </button>
        </header>

        {/* ════════ Stats Grid ════════ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                    <Icon size={15} strokeWidth={2} style={{ color: s.color }} />
                  </div>
                  <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                </div>
                <p className="text-xl font-heading font-bold text-gray-900">
                  {s.isBnb ? <BnbValue amount={s.value} /> : s.value}
                </p>
              </div>
            );
          })}
        </section>

        {/* ════════ Create Campaign Panel ════════ */}
        {isCreateOpen && (
          <section className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-8">

              {/* ── Left: AI Brief ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                    <Sparkles size={16} strokeWidth={2} className="text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-gray-900">AI Brief</h3>
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
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-body font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
                >
                  {draftLoading ? (
                    <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Analyzing...</>
                  ) : (
                    <><Sparkles size={15} /> Generate AI Proposal</>
                  )}
                </button>

                {draftResult && (
                  <div className="border border-emerald-200 rounded-xl p-3 space-y-2" style={{ background: "rgba(16,185,129,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={2.5} />
                      <span className="text-xs font-body font-semibold text-emerald-700">
                        AI Analysis Complete - Confidence {draftResult.confidence.milestonePlan}/10
                      </span>
                    </div>
                    <p className="text-xs font-body text-emerald-800">{draftResult.brandIntent}</p>
                    <button onClick={applyDraftToForm} className="w-full rounded-lg bg-emerald-600 text-white text-xs font-bold py-2">
                      Apply Proposal To Form
                    </button>
                  </div>
                )}
              </div>

              {/* ── Divider ── */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-100" style={{ position: "relative", width: 0, margin: "0 -16px" }}>
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-100" />
              </div>

              {/* ── Right: Contract Form ── */}
              <div className="space-y-5 md:border-l md:border-gray-100 md:pl-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <Wallet size={16} strokeWidth={2} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-gray-900">Smart Contract</h3>
                    <p className="text-[10px] font-body text-gray-400">Deploy on BNB Chain</p>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Influencer Address</label>
                  <input className={`${inputClass} font-mono`} placeholder="Influencer wallet" value={influencer} onChange={(e) => setInfluencer(e.target.value)} />
                </div>

                <div>
                  <label className={labelClass}>Milestones (BNB)</label>
                  <input className={`${inputClass} font-mono`} placeholder="Milestones in BNB, comma-separated" value={milestonesCsv} onChange={(e) => setMilestonesCsv(e.target.value)} />
                  <p className="text-[10px] font-body text-gray-400 mt-1">Total: {formatEther(milestoneInput.total)} BNB</p>
                </div>

                <div>
                  <label className={labelClass}>Agency Fee (BPS)</label>
                  <input className={`${inputClass} font-mono`} placeholder="Agency fee in bps (e.g. 500)" value={agencyFeeBps} onChange={(e) => setAgencyFeeBps(e.target.value)} />
                </div>

                <ContractButton
                  label="Create On-Chain Campaign"
                  confirmTitle="Confirm Creation"
                  confirmMessage={`Create campaign for ${formatEther(milestoneInput.total)} BNB?`}
                  onExecute={async () => { await handleCreate(); }}
                  disabled={!!milestoneInput.error || !agencyFeeInputValid || !influencer}
                  className="w-full font-bold"
                  size="lg"
                  color="primary"
                />
              </div>
            </div>
          </section>
        )}

        {/* ════════ Campaign List ════════ */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-heading font-bold text-gray-900">Your Campaigns</h2>
            <span className="text-xs font-body font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {campaigns.length}
            </span>
          </div>

          {loading ? (
            <div className="glass-card rounded-3xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "rgba(99,102,241,0.08)" }}>
                <div className="animate-spin w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full" />
              </div>
              <p className="text-sm font-body text-gray-400">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="glass-card rounded-3xl p-16 text-center border border-dashed border-gray-200">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "rgba(99,102,241,0.08)" }}>
                <Send size={24} className="text-indigo-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-heading font-bold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-sm font-body text-gray-400 mb-5 max-w-xs mx-auto">Create your first campaign to start managing influencer partnerships on-chain.</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-indigo-600"
                style={{ background: "rgba(99,102,241,0.08)" }}
              >
                <Plus size={15} strokeWidth={2.5} /> Create Campaign
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              {campaigns.map((c) => (
                <div key={c.id.toString()} className="glass-card rounded-2xl overflow-hidden">
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
                            }}
                            variant="flat"
                            color="default"
                            size="sm"
                          />
                        )}
                        <ContractButton
                          label="Release"
                          confirmTitle="Release Funds"
                          confirmMessage="Release all approved payments?"
                          onExecute={async () => { await actions.releaseFunds(c.id); }}
                          disabled={!c.milestones.some((m) => m.approved && !m.paid)}
                          color="success"
                          variant="solid"
                          size="sm"
                          className="text-white"
                        />
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}
