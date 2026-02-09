"use client";

import { CampaignView, formatBnb, stateLabel } from "@/lib/campaigns";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

type CampaignCardProps = {
  campaign: CampaignView;
  actionSlot?: React.ReactNode;
};

export function CampaignCard({ campaign, actionSlot }: CampaignCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Campaign #{campaign.id.toString()}</h3>
        <span className="rounded-full bg-mist px-3 py-1 text-xs text-steel">{stateLabel(campaign.state)}</span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-steel md:grid-cols-2">
        <p>Brand: {shortAddress(campaign.brand)}</p>
        <p>Influencer: {shortAddress(campaign.influencer)}</p>
        <p>Escrowed: {formatBnb(campaign.totalEscrowed)}</p>
        <p>Released: {formatBnb(campaign.totalReleased)}</p>
        <p>Total Budget: {formatBnb(campaign.totalMilestoneAmount)}</p>
        <p>Agency Fee: {(campaign.agencyFeeBps / 100).toFixed(2)}%</p>
      </div>

      <div className="mt-3 space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
        <p className="font-medium text-ink">Milestones</p>
        {campaign.milestones.map((m) => (
          <p key={m.index.toString()} className="text-steel">
            #{m.index.toString()} · {formatBnb(m.amount)} ·{" "}
            {m.paid ? "Paid" : m.approved ? "Approved" : m.proofHash ? "Proof Submitted" : "Pending Proof"}
          </p>
        ))}
      </div>

      {actionSlot && <div className="mt-4 flex flex-wrap gap-2">{actionSlot}</div>}
    </article>
  );
}
