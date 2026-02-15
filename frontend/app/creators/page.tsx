"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserCircle2, Link2, BadgeCheck, BriefcaseBusiness, Sparkles } from "lucide-react";
import { fetchAllCampaigns, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import type { RegisteredProfile } from "@/lib/profile-types";

type CreatorsResponse = {
  creators?: RegisteredProfile[];
  error?: string;
};

type CreatorProof = {
  campaignId: bigint;
  milestoneNumber: number;
  proofHash: string;
  approved: boolean;
  paid: boolean;
};

function proofHref(proofHash: string): string | null {
  const trimmed = proofHash.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("ipfs://")) {
    const rawPath = trimmed.slice("ipfs://".length).replace(/^ipfs\//, "").trim();
    if (!rawPath) {
      return null;
    }
    return `https://ipfs.io/ipfs/${rawPath}`;
  }
  return null;
}

function shortAddr(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function CreatorsPage() {
  const [search, setSearch] = useState("");
  const [creators, setCreators] = useState<RegisteredProfile[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [creatorsResponse, campaignRows] = await Promise.all([
          fetch("/api/profiles/creators", { method: "GET", cache: "no-store" }),
          isContractConfigured ? fetchAllCampaigns() : Promise.resolve([] as CampaignView[])
        ]);

        const creatorsPayload = (await creatorsResponse.json().catch(() => null)) as CreatorsResponse | null;
        if (!creatorsResponse.ok) {
          throw new Error(creatorsPayload?.error ?? "Failed to load creator profiles.");
        }
        if (!cancelled) {
          setCreators(Array.isArray(creatorsPayload?.creators) ? creatorsPayload?.creators : []);
          setCampaigns(campaignRows);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load creators.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const proofsByCreator = useMemo(() => {
    const map = new Map<string, CreatorProof[]>();
    for (const campaign of campaigns) {
      const key = campaign.influencer.toLowerCase();
      for (const milestone of campaign.milestones) {
        const proofHash = milestone.proofHash.trim();
        if (!proofHash) {
          continue;
        }
        const rows = map.get(key) ?? [];
        rows.push({
          campaignId: campaign.id,
          milestoneNumber: Number(milestone.index) + 1,
          proofHash,
          approved: milestone.approved,
          paid: milestone.paid
        });
        map.set(key, rows);
      }
    }
    for (const [wallet, rows] of map.entries()) {
      rows.sort((a, b) => Number(b.campaignId - a.campaignId));
      map.set(wallet, rows);
    }
    return map;
  }, [campaigns]);

  const activeCampaignCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const campaign of campaigns) {
      if (campaign.state === 2 || campaign.state === 3) {
        continue;
      }
      const key = campaign.influencer.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [campaigns]);

  const filteredCreators = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return creators;
    }
    return creators.filter((creator) =>
      [
        creator.displayName,
        creator.email,
        creator.instagram,
        creator.telegram,
        creator.x,
        creator.walletAddress
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [creators, search]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
            <Sparkles size={18} className="text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-gray-900">Creator Directory</h1>
            <p className="text-sm font-body text-gray-400 font-medium">
              Global creator list with on-platform proof-of-work
            </p>
          </div>
        </div>
      </header>

      <section className="glass-card rounded-2xl p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search creators by name, wallet, email, social"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm font-body text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
        </div>
      </section>

      {loading ? (
        <section className="glass-card rounded-3xl p-14 text-center">
          <p className="text-sm font-body text-gray-400 animate-pulse">Loading creators...</p>
        </section>
      ) : error ? (
        <section className="glass-card rounded-3xl p-10 text-center border border-red-100">
          <p className="text-sm font-body text-red-500 font-medium">{error}</p>
        </section>
      ) : filteredCreators.length === 0 ? (
        <section className="glass-card rounded-3xl p-14 text-center">
          <p className="text-base font-heading font-bold text-gray-700">No creators found</p>
          <p className="text-sm font-body text-gray-400 mt-1">Try a different search keyword.</p>
        </section>
      ) : (
        <section className="grid gap-5">
          {filteredCreators.map((creator) => {
            const proofRows = proofsByCreator.get(creator.walletAddress.toLowerCase()) ?? [];
            const activeCampaigns = activeCampaignCounts.get(creator.walletAddress.toLowerCase()) ?? 0;
            const available = activeCampaigns < 3;

            return (
              <article key={creator.walletAddress} className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/70 border border-gray-200 flex items-center justify-center">
                      {creator.avatarDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creator.avatarDataUrl} alt={creator.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-heading font-bold text-gray-900">{creator.displayName}</h2>
                      <p className="text-xs font-mono text-gray-500">{shortAddr(creator.walletAddress)}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                          style={{
                            color: available ? "#10b981" : "#f59e0b",
                            background: available ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)"
                          }}
                        >
                          {available ? "Available" : "Busy"}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                          Active Campaigns: {activeCampaigns}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-violet-50 text-violet-600">
                          Proof Items: {proofRows.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500 space-y-1">
                    <p>IG: {creator.instagram}</p>
                    <p>TG: {creator.telegram}</p>
                    <p>X: {creator.x}</p>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <BriefcaseBusiness size={13} />
                    Proof of Work
                  </div>

                  {proofRows.length === 0 ? (
                    <p className="text-sm font-body text-gray-400">No proof submissions on-chain yet.</p>
                  ) : (
                    <div className="grid gap-2">
                      {proofRows.slice(0, 8).map((proof, index) => {
                        const href = proofHref(proof.proofHash);
                        return (
                          <div
                            key={`${creator.walletAddress}-${proof.campaignId.toString()}-${proof.milestoneNumber}-${index}`}
                            className="rounded-xl border border-gray-100 bg-white/70 px-3 py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800">
                                Campaign #{proof.campaignId.toString()} - M{proof.milestoneNumber}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">{proof.proofHash}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-[10px] px-2 py-1 rounded-full font-bold"
                                style={{
                                  color: proof.paid ? "#10b981" : proof.approved ? "#6366f1" : "#f59e0b",
                                  background: proof.paid
                                    ? "rgba(16,185,129,0.12)"
                                    : proof.approved
                                      ? "rgba(99,102,241,0.12)"
                                      : "rgba(245,158,11,0.12)"
                                }}
                              >
                                {proof.paid ? "Paid" : proof.approved ? "Approved" : "Pending"}
                              </span>

                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                                >
                                  <Link2 size={11} />
                                  Open
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-bold">
                                  <BadgeCheck size={11} />
                                  Hash
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

