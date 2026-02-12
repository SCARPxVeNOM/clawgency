"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LayoutDashboard, User, ShieldCheck, ArrowUpRight, Rocket, Award, Settings2 } from "lucide-react";

const features = [
    {
        href: "/brand/dashboard",
        title: "Brand Dashboard",
        desc: "Create campaigns & manage escrow",
        icon: LayoutDashboard,
        badge: "Launch Campaigns",
        badgeIcon: Rocket,
        accentColor: "#6366f1",
        accentBg: "rgba(99, 102, 241, 0.08)",
        topBorder: "from-indigo-400 via-indigo-500 to-blue-500",
    },
    {
        href: "/influencer/dashboard",
        title: "Creator Hub",
        desc: "Submit proofs & track milestones",
        icon: User,
        badge: "Proof of Work",
        badgeIcon: Award,
        accentColor: "#10b981",
        accentBg: "rgba(16, 185, 129, 0.08)",
        topBorder: "from-emerald-400 via-green-500 to-teal-500",
    },
    {
        href: "/admin/analytics",
        title: "Admin Console",
        desc: "Monitor logs & system health",
        icon: ShieldCheck,
        badge: "System Control",
        badgeIcon: Settings2,
        accentColor: "#f59e0b",
        accentBg: "rgba(245, 158, 11, 0.08)",
        topBorder: "from-amber-400 via-yellow-500 to-orange-400",
    },
];

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            delay: 0.3 + i * 0.12,
            ease: "easeOut" as const,
        },
    }),
};

export function FeatureCards() {
    return (
        <section className="relative mt-10">
            <div className="grid gap-6 md:grid-cols-3">
                {features.map((card, index) => {
                    const Icon = card.icon;
                    const BadgeIcon = card.badgeIcon;

                    return (
                        <motion.div
                            key={card.href}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            variants={cardVariants}
                        >
                            <Link href={card.href} className="block group">
                                <div className="glass-card rounded-3xl p-6 relative overflow-hidden h-full cursor-pointer">
                                    {/* Top accent bar */}
                                    <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.topBorder} opacity-80`} />

                                    {/* Icon + Arrow */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div
                                            className="p-3 rounded-2xl"
                                            style={{ backgroundColor: card.accentBg, color: card.accentColor }}
                                        >
                                            <Icon size={24} strokeWidth={2} />
                                        </div>
                                        <ArrowUpRight
                                            size={18}
                                            strokeWidth={2}
                                            className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300"
                                        />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1.5">
                                        {card.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4">
                                        {card.desc}
                                    </p>

                                    {/* Badge */}
                                    <div
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em]"
                                        style={{
                                            backgroundColor: card.accentBg,
                                            color: card.accentColor,
                                        }}
                                    >
                                        <BadgeIcon size={11} strokeWidth={3} />
                                        {card.badge}
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
