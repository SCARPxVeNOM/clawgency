"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import toast from "react-hot-toast";
import { CampaignCard } from "@/components/CampaignCard";
import { ContractButton } from "@/components/ContractButton";
import { RoleGuard } from "@/components/RoleGuard";
import { useSession } from "@/context/SessionContext";
import { fetchAllCampaigns, stateLabel, subscribeCampaignEvents, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import { useContractActions } from "@/lib/useContractActions";
import type { Workflow1Response } from "@/types/agent";

export default function BrandDashboardPage() {
  const { walletAddress, isConnected } = useSession();
  const actions = useContractActions();

  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState("");
  const [milestonesCsv, setMilestonesCsv] = useState("0.3,0.3,0.4");
  const [agencyFeeBps, setAgencyFeeBps] = useState("500");
  const [depositCampaignId, setDepositCampaignId] = useState("");
  const [depositAmount, setDepositAmount] = useState("1.0");
  const [draftHeadline, setDraftHeadline] = useState("Need fitness influencer");
  const [draftBudgetBnb, setDraftBudgetBnb] = useState("1");
  const [draftDeliverables, setDraftDeliverables] = useState("Instagram reel + TikTok");
  const [draftTimeline, setDraftTimeline] = useState("3 days");
  const [draftBrandAddr, setDraftBrandAddr] = useState("0x1111111111111111111111111111111111111111");
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
    const stopWatching = subscribeCampaignEvents(() => {
      void loadCampaigns();
    });
    const interval = setInterval(() => void loadCampaigns(), 12_000);
    return () => {
      stopWatching();
      clearInterval(interval);
    };
  }, [loadCampaigns]);

  const depositCandidateCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.state !== 2 && campaign.state !== 3),
    [campaigns]
  );

  const milestoneInput = useMemo(() => {
    const parts = milestonesCsv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return {
        milestones: [] as bigint[],
        total: 0n,
        error: "Enter at least one milestone amount."
      };
    }

    const milestones: bigint[] = [];
    let total = 0n;

    for (let index = 0; index < parts.length; index++) {
      const value = parts[index];
      let wei: bigint;
      try {
        wei = parseEther(value);
      } catch {
        return {
          milestones: [] as bigint[],
          total: 0n,
          error: `Milestone ${index + 1} is not a valid BNB amount.`
        };
      }

      if (wei <= 0n) {
        return {
          milestones: [] as bigint[],
          total: 0n,
          error: `Milestone ${index + 1} must be greater than 0.`
        };
      }

      milestones.push(wei);
      total += wei;
    }

    return { milestones, total, error: "" };
  }, [milestonesCsv]);

  const selectedDepositCampaign = useMemo(
    () => depositCandidateCampaigns.find((campaign) => campaign.id.toString() === depositCampaignId),
    [depositCandidateCampaigns, depositCampaignId]
  );

  const selectedCampaignRemaining = useMemo(() => {
    if (!selectedDepositCampaign) {
      return 0n;
    }
    if (selectedDepositCampaign.totalEscrowed >= selectedDepositCampaign.totalMilestoneAmount) {
      return 0n;
    }
    return selectedDepositCampaign.totalMilestoneAmount - selectedDepositCampaign.totalEscrowed;
  }, [selectedDepositCampaign]);

  const agencyFeeInputValid = useMemo(() => {
    const parsed = Number(agencyFeeBps);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 3000;
  }, [agencyFeeBps]);

  useEffect(() => {
    if (depositCandidateCampaigns.length === 0) {
      if (depositCampaignId) {
        setDepositCampaignId("");
      }
      return;
    }

    const exists = depositCandidateCampaigns.some((campaign) => campaign.id.toString() === depositCampaignId);
    if (!exists) {
      setDepositCampaignId(depositCandidateCampaigns[0].id.toString());
    }
  }, [depositCandidateCampaigns, depositCampaignId]);

  const canSubmitCreate = useMemo(
    () =>
      Boolean(
        isConnected &&
          walletAddress &&
          isAddress(influencer) &&
          agencyFeeInputValid &&
          !milestoneInput.error &&
          milestoneInput.milestones.length > 0
      ),
    [agencyFeeInputValid, influencer, isConnected, milestoneInput.error, milestoneInput.milestones.length, walletAddress]
  );

  async function createCampaign() {
    if (!walletAddress || !isAddress(influencer)) {
      toast.error("Provide a valid influencer address.");
      return;
    }
    if (milestoneInput.error) {
      throw new Error(milestoneInput.error);
    }

    const feeBps = Number(agencyFeeBps);
    if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 3000) {
      throw new Error("Agency fee must be an integer between 0 and 3000 bps.");
    }

    await actions.createCampaign(walletAddress, influencer as `0x${string}`, milestoneInput.milestones, feeBps);
    await loadCampaigns();
  }

  async function deposit() {
    if (!depositCampaignId.trim() || !selectedDepositCampaign) {
      throw new Error("Select a valid campaign from your list.");
    }
    if (!isConnected) {
      throw new Error("Connect your wallet to deposit.");
    }

    let amountWei: bigint;
    try {
      amountWei = parseEther(depositAmount);
    } catch {
      throw new Error("Enter a valid BNB amount for deposit.");
    }

    if (amountWei <= 0n) {
      throw new Error("Deposit amount must be greater than 0.");
    }
    if (selectedCampaignRemaining > 0n && amountWei > selectedCampaignRemaining) {
      throw new Error(`Deposit exceeds required escrow (${formatEther(selectedCampaignRemaining)} BNB).`);
    }

    const campaignId = BigInt(depositCampaignId);
    await actions.depositFunds(campaignId, depositAmount);
    await loadCampaigns();
  }

  function fillDepositWithRemaining() {
    if (!selectedDepositCampaign) {
      return;
    }
    setDepositAmount(selectedCampaignRemaining > 0n ? formatEther(selectedCampaignRemaining) : "0");
  }

  useEffect(() => {
    if (walletAddress) {
      setDraftBrandAddr(walletAddress);
    }
  }, [walletAddress]);

  async function generateDraft() {
    if (!draftBrandAddr || !isAddress(draftBrandAddr)) {
      toast.error("Provide a valid brand address for draft generation.");
      return;
    }

    setDraftLoading(true);
    try {
      const response = await fetch("/api/agent/workflow1", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          headline: draftHeadline,
          budgetBNB: draftBudgetBnb,
          deliverables: draftDeliverables,
          timeline: draftTimeline,
          brandAddr: draftBrandAddr
        })
      });

      const payload = (await response.json()) as Workflow1Response | { error?: string };
      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error ?? "Draft request failed." : "Draft request failed.");
      }

      setDraftResult(payload as Workflow1Response);
      toast.success("Draft proposal generated. Review before applying.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft request failed.";
      toast.error(message);
    } finally {
      setDraftLoading(false);
    }
  }

  function applyDraftProposal() {
    if (!draftResult) {
      return;
    }

    const params = draftResult.transactionProposal.params;
    const influencerAddress = params[1];
    const milestoneCsv = params[2].map((wei) => formatEther(BigInt(wei))).join(",");
    const feeBps = String(params[3]);

    setInfluencer(influencerAddress);
    setMilestonesCsv(milestoneCsv);
    setAgencyFeeBps(feeBps);
    setDepositAmount(draftResult.budgetBNB);
    toast.success("Draft applied to form. Manually review, then submit transaction.");
  }

  return (
    <RoleGuard allow={["brand"]}>
      <div className="space-y-5">
        <section className="section-card reveal-up p-5">
          <h2 className="card-title">Brand Dashboard</h2>
          <p className="card-subtitle">
            Review influencer proofs, approve milestones, and manually release funds when ready.
          </p>
          <div className="mt-3 grid gap-2 text-xs text-steel md:grid-cols-3">
            <p className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2">1. Create campaign terms</p>
            <p className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2">2. Deposit escrow balance</p>
            <p className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2">3. Approve proof, then release</p>
          </div>

          {!isContractConfigured && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              Set `NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS` in `frontend/.env.local`.
            </p>
          )}
        </section>

        <section className="section-card reveal-up reveal-delay-1 p-5">
          <h3 className="text-sm font-semibold text-ink">AI Campaign Drafting (OpenClaw)</h3>
          <p className="card-subtitle">
            Generates a structured transaction proposal only. On-chain actions still require manual wallet confirmation.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={draftBrandAddr}
              onChange={(e) => setDraftBrandAddr(e.target.value)}
              placeholder="Brand wallet address"
              className="input-field"
            />
            <input
              value={draftHeadline}
              onChange={(e) => setDraftHeadline(e.target.value)}
              placeholder="Campaign headline"
              className="input-field"
            />
            <input
              value={draftBudgetBnb}
              onChange={(e) => setDraftBudgetBnb(e.target.value)}
              placeholder="Budget in BNB"
              className="input-field"
            />
            <input
              value={draftDeliverables}
              onChange={(e) => setDraftDeliverables(e.target.value)}
              placeholder="Deliverables"
              className="input-field"
            />
            <input
              value={draftTimeline}
              onChange={(e) => setDraftTimeline(e.target.value)}
              placeholder="Timeline (e.g. 3 days)"
              className="input-field"
            />
          </div>

          <button onClick={() => void generateDraft()} disabled={draftLoading} className="btn-primary mt-3 px-3 py-2 text-xs">
            {draftLoading ? "Generating..." : "Generate AI Proposal"}
          </button>

          {draftResult && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200/90 bg-white/75 p-4 text-xs shadow-sm reveal-up">
              <p className="font-semibold text-ink">{draftResult.brandIntent}</p>
              <p className="text-steel">
                Confidence: extraction {draftResult.confidence.extraction.toFixed(2)}, category{" "}
                {draftResult.confidence.category.toFixed(2)}, milestones {draftResult.confidence.milestonePlan.toFixed(2)}
              </p>
              <p className="text-steel">Suggested influencers: {draftResult.suggestedInfluencers.join(", ")}</p>
              <p className="text-steel">
                Proposal: {draftResult.transactionProposal.contractFunction}(
                {draftResult.transactionProposal.params[0]}, {draftResult.transactionProposal.params[1]}, milestones[],
                {draftResult.transactionProposal.params[3]})
              </p>
              {draftResult.validationWarnings.length > 0 && (
                <p className="text-amber-700">Warnings: {draftResult.validationWarnings.join(" | ")}</p>
              )}
              <button onClick={applyDraftProposal} className="btn-secondary px-3 py-1.5 text-xs">
                Apply Proposal To Form
              </button>
            </div>
          )}
        </section>

        <section className="section-card reveal-up reveal-delay-2 grid gap-4 p-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Create Campaign</h3>
            <input
              value={influencer}
              onChange={(e) => setInfluencer(e.target.value)}
              placeholder="Influencer wallet"
              className="input-field mt-2"
            />
            <input
              value={milestonesCsv}
              onChange={(e) => setMilestonesCsv(e.target.value)}
              placeholder="Milestones in BNB, comma-separated"
              className="input-field mt-2"
            />
            <p className="mt-1 text-xs text-steel">
              Total budget preview: {milestoneInput.error ? "Invalid input" : `${formatEther(milestoneInput.total)} BNB`}
            </p>
            {milestoneInput.error && <p className="mt-1 text-xs text-red-700">{milestoneInput.error}</p>}
            <input
              value={agencyFeeBps}
              onChange={(e) => setAgencyFeeBps(e.target.value)}
              placeholder="Agency fee in bps (e.g. 500)"
              className="input-field mt-2"
            />
            {!agencyFeeInputValid && <p className="mt-1 text-xs text-red-700">Agency fee must be 0 to 3000 bps.</p>}
            <div className="mt-2">
              <ContractButton
                label="Create Campaign"
                confirmTitle="Create campaign on-chain?"
                confirmMessage="This creates a new campaign. Transaction must be manually confirmed in wallet."
                disabled={!canSubmitCreate}
                onExecute={createCampaign}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Deposit Campaign Funds</h3>
            <select value={depositCampaignId} onChange={(e) => setDepositCampaignId(e.target.value)} className="input-field mt-2">
              {depositCandidateCampaigns.length === 0 && <option value="">No active campaigns available</option>}
              {depositCandidateCampaigns.map((campaign) => (
                <option key={campaign.id.toString()} value={campaign.id.toString()}>
                  Campaign #{campaign.id.toString()} - {stateLabel(campaign.state)}
                </option>
              ))}
            </select>
            <input
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount in BNB"
              className="input-field mt-2"
            />
            {selectedDepositCampaign && (
              <>
                <p className="mt-2 text-xs text-steel">
                  Escrowed {formatEther(selectedDepositCampaign.totalEscrowed)} /{" "}
                  {formatEther(selectedDepositCampaign.totalMilestoneAmount)} BNB
                </p>
                <p className="mt-1 text-xs text-steel">Remaining required: {formatEther(selectedCampaignRemaining)} BNB</p>
                <button onClick={fillDepositWithRemaining} className="btn-secondary mt-2 px-2.5 py-1 text-xs">
                  Fill Remaining Amount
                </button>
              </>
            )}
            <div className="mt-2">
              <ContractButton
                label="Deposit"
                confirmTitle="Deposit escrow funds?"
                confirmMessage="This sends BNB to campaign escrow."
                disabled={!isConnected || !selectedDepositCampaign}
                onExecute={deposit}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 reveal-up reveal-delay-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Your Campaigns</h3>
          {loading && <p className="text-sm text-steel">Loading campaigns...</p>}
          {!loading && campaigns.length === 0 && (
            <p className="section-card p-4 text-sm text-steel">No campaigns found for this brand wallet.</p>
          )}
          {campaigns.map((campaign) => {
            const hasApprovedUnpaid = campaign.milestones.some((m) => m.approved && !m.paid);
            const approvableMilestones = campaign.milestones.filter((m) => !m.approved && m.proofHash);

            return (
              <CampaignCard
                key={campaign.id.toString()}
                campaign={campaign}
                actionSlot={
                  <>
                    {approvableMilestones.map((m) => (
                      <ContractButton
                        key={`approve-${campaign.id}-${m.index}`}
                        label={`Approve M${m.index.toString()}`}
                        confirmTitle="Approve milestone?"
                        confirmMessage={`Approve milestone ${m.index.toString()} for campaign #${campaign.id.toString()} after manual proof review.`}
                        onExecute={() => actions.approveMilestone(campaign.id, m.index).then(() => loadCampaigns())}
                      />
                    ))}
                    <ContractButton
                      label="Release Approved Funds"
                      confirmTitle="Release approved funds?"
                      confirmMessage="This executes on-chain payout split for approved milestones."
                      disabled={!hasApprovedUnpaid}
                      onExecute={() => actions.releaseFunds(campaign.id).then(() => loadCampaigns())}
                    />
                  </>
                }
              />
            );
          })}
        </section>
      </div>
    </RoleGuard>
  );
}
