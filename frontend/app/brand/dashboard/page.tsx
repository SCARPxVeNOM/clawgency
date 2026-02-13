"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  Plus, Wallet, CheckCircle2, ChevronUp,
  BarChart3, Coins, Zap, Building2, Sparkles, Send, Lock
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

  const aiGateError = useMemo(() => {
    if (!draftResult) return "Generate AI proposal first.";
    if (!isDraftAppliedToForm) return "Apply AI proposal to contract form first.";
    return "";
  }, [draftResult, isDraftAppliedToForm]);

  const createDisabledReason = baseCreateValidationError || aiGateError;
  const createDisabled = Boolean(createDisabledReason);

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
  };

  const handleDrafting = async () => {
    setDraftLoading(true);
    setDraftResult(null);
    setIsDraftAppliedToForm(false);

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
    setIsDraftAppliedToForm(true);
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

                  {!draftResult || !isDraftAppliedToForm ? (
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
                        <p className="text-xs text-amber-800 mt-1">Generate and apply AI proposal before creating on-chain campaign.</p>
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
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">AI Proposal Ready</p>
                        <p className="text-xs text-emerald-800 mt-1">Smart contract deployment is unlocked.</p>
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

