"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { BarChart3, Users, Lock, Coins } from "lucide-react";

function AnimatedNumber({ value, duration = 2 }: { value: number; duration?: number }) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (v) => Math.floor(v).toLocaleString());

    useEffect(() => {
        const controls = animate(count, value, { duration, ease: "easeOut" });
        return controls.stop;
    }, [count, value, duration]);

    return <motion.span>{rounded}</motion.span>;
}

const stats = [
    {
        label: "Active Campaigns",
        value: 247,
        icon: BarChart3,
        accentColor: "#3b82f6",
        suffix: "",
    },
    {
        label: "Verified Creators",
        value: 1840,
        icon: Users,
        accentColor: "#22c55e",
        suffix: "",
    },
    {
        label: "Escrow Locked",
        value: 4520,
        icon: Lock,
        accentColor: "#facc15",
        suffix: " BNB",
        hasCoin: true,
    },
];

const statVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.12 + 0.6, ease: "easeOut" as const },
    }),
};

export function StatsSection() {
    return (
        <section className="mt-8 mb-4">
            <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                        <motion.div
                            key={stat.label}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            variants={statVariants}
                            className="glass-stat"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="p-2 rounded-lg border-2 border-black"
                                    style={{ backgroundColor: stat.accentColor + "18" }}
                                >
                                    <Icon size={18} strokeWidth={2.5} style={{ color: stat.accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{stat.label}</p>
                                    <p className="text-xl font-black text-black flex items-center gap-1">
                                        <AnimatedNumber value={stat.value} />
                                        {stat.suffix && <span className="text-xs font-bold text-gray-400">{stat.suffix}</span>}
                                        {stat.hasCoin && (
                                            <motion.span
                                                animate={{ rotate: [0, 15, -15, 0], y: [0, -3, 0] }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                            >
                                                <Coins size={14} className="text-yellow-500" strokeWidth={2.5} />
                                            </motion.span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Subtle glow bar at bottom */}
                            <div
                                className="absolute bottom-0 left-0 w-full h-0.5 rounded-b-xl"
                                style={{ background: `linear-gradient(90deg, transparent, ${stat.accentColor}40, transparent)` }}
                            />
                        </motion.div>
                    );
                })}
            </div>

            {/* Security micro-label */}
            <motion.div
                className="text-center mt-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
            >
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Lock size={10} strokeWidth={3} />
                    Smart Contract Secured
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </span>
            </motion.div>
        </section>
    );
}
