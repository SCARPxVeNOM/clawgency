"use client";

import { Search, SlidersHorizontal, Compass, Sparkles } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { useEffect, useState } from "react";
import { fetchAllCampaigns, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";

export default function ExplorePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isContractConfigured) {
            setLoading(false);
            return;
        }
        fetchAllCampaigns()
            .then(setCampaigns)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = campaigns.filter(
        (c) =>
            !searchQuery ||
            c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(c.id).includes(searchQuery)
    );

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-2xl" style={{ background: "rgba(99,102,241,0.08)" }}>
                        <Compass size={22} className="text-indigo-500" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-gray-900 tracking-tight">
                            Explore Campaigns
                        </h1>
                        <p className="text-sm font-body text-gray-400 font-medium mt-0.5">
                            Discover active opportunities from top brands
                        </p>
                    </div>
                </div>
            </header>

            {/* Search & Filter Bar */}
            <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                    <input
                        type="text"
                        placeholder="Search campaigns by name, brand..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm font-body text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm font-body font-medium text-gray-500 hover:text-gray-700 hover:bg-white/80 transition-all">
                    <SlidersHorizontal size={15} strokeWidth={2} />
                    Filters
                </button>
            </div>

            {/* Campaign Grid */}
            {loading ? (
                <div className="glass-card rounded-3xl p-16 text-center">
                    <p className="text-sm font-body text-gray-400 animate-pulse">Loading campaigns...</p>
                </div>
            ) : filtered.length === 0 ? (
                /* Empty State */
                <div className="glass-card rounded-3xl p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "rgba(99,102,241,0.08)" }}>
                        <Sparkles size={28} className="text-indigo-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-heading font-bold text-gray-900 mb-2">
                        No campaigns yet
                    </h3>
                    <p className="text-sm font-body text-gray-400 max-w-sm mx-auto">
                        Campaigns created by brands will appear here. Connect your wallet to get started.
                    </p>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                    {filtered.map((c) => (
                        <div key={c.id} className="glass-card rounded-2xl overflow-hidden">
                            <CampaignCard campaign={c} />
                        </div>
                    ))}
                </div>
            )}

            {/* Results footer */}
            {filtered.length > 0 && (
                <p className="text-center text-xs font-body text-gray-400 pt-2">
                    Showing {filtered.length} campaign{filtered.length !== 1 ? "s" : ""} from on-chain data
                </p>
            )}
        </div>
    );
}
