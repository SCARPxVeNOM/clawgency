"use client";

import { motion } from "framer-motion";
import { Monitor, Cpu, Smartphone, Check } from "lucide-react";

/* ── Cloud Bubble ── */
function CloudBubble({
    text,
    color,
    delay,
    className = "",
}: {
    text: string;
    color: string;
    delay: number;
    className?: string;
}) {
    return (
        <motion.div
            className={`absolute ${className}`}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.6, ease: "easeOut" }}
        >
            <div
                className="px-4 py-2.5 rounded-2xl text-[11px] font-body font-semibold whitespace-nowrap shadow-lg backdrop-blur-md"
                style={{
                    background: `${color}08`,
                    border: `1px solid ${color}25`,
                    color,
                }}
            >
                {text}
            </div>
            {/* Tail */}
            <div
                className="w-3 h-3 mx-auto -mt-1 rotate-45 rounded-sm"
                style={{ background: `${color}08`, borderRight: `1px solid ${color}25`, borderBottom: `1px solid ${color}25` }}
            />
        </motion.div>
    );
}

/* ── Animated Arrow ── */
function FlowArrow({ delay }: { delay: number }) {
    return (
        <motion.div
            className="flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay, duration: 0.5 }}
        >
            <div className="relative w-16 md:w-24 h-[2px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <motion.div
                    className="absolute top-0 left-0 w-8 h-full"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }}
                    animate={{ x: ["-32px", "96px"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear", delay }}
                />
            </div>
            <motion.div
                className="w-0 h-0"
                style={{
                    borderTop: "5px solid transparent",
                    borderBottom: "5px solid transparent",
                    borderLeft: "6px solid rgba(99,102,241,0.4)",
                }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay }}
            />
        </motion.div>
    );
}

/* ── Particle Ring (for AI agent) ── */
function ParticleRing() {
    return (
        <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
            {[0, 60, 120, 180, 240, 300].map((deg) => (
                <motion.div
                    key={deg}
                    className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400/50"
                    style={{
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${deg}deg) translateY(-44px)`,
                    }}
                    animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 3, repeat: Infinity, delay: deg / 360 }}
                />
            ))}
        </motion.div>
    );
}

/* ── Main Visual Flow ── */
export function VisualFlow() {
    return (
        <section className="relative flex items-center justify-center py-8 md:py-16">
            {/* Spotlight behind AI Agent */}
            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)" }}
            />

            <div className="grid grid-cols-3 items-center gap-4 md:gap-12 max-w-3xl w-full">
                {/* ── BRAND (Left) ── */}
                <div className="flex flex-col items-center relative">
                    <CloudBubble
                        text="Summer Campaign – 5 BNB"
                        color="#6366f1"
                        delay={1.2}
                        className="-top-16 md:-top-20 left-1/2 -translate-x-1/2"
                    />

                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    >
                        {/* Person + laptop illustration */}
                        <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center relative" style={{ background: "rgba(99,102,241,0.06)" }}>
                            <div className="relative">
                                {/* Laptop body */}
                                <div className="w-12 h-8 md:w-16 md:h-10 rounded-t-lg border-2 border-indigo-300/40 bg-white/80 flex items-center justify-center overflow-hidden">
                                    {/* Typing cursor animation */}
                                    <div className="flex items-end gap-[2px]">
                                        <motion.div
                                            className="w-6 md:w-8 h-[2px] bg-indigo-300 rounded-full"
                                            animate={{ opacity: [1, 0.3, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
                                        <motion.div
                                            className="w-[2px] h-3 bg-indigo-500"
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                        />
                                    </div>
                                </div>
                                {/* Laptop base */}
                                <div className="w-14 h-1 md:w-[72px] md:h-1.5 bg-indigo-200/50 rounded-b-lg mx-auto" />
                            </div>

                            {/* Soft glow */}
                            <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: "0 0 40px rgba(99,102,241,0.1)" }} />
                        </div>
                    </motion.div>

                    <motion.p
                        className="mt-3 text-xs md:text-sm font-heading font-bold text-gray-700 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        Brand
                    </motion.p>
                </div>

                {/* ── ARROW 1 ── */}
                <div className="absolute left-[28%] md:left-[30%] top-1/2 -translate-y-1/2 z-10 hidden sm:block">
                    <FlowArrow delay={1.5} />
                </div>

                {/* ── AI AGENT (Center) ── */}
                <div className="flex flex-col items-center relative">
                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                    >
                        <motion.div
                            className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative"
                            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.12))" }}
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            {/* Particle ring */}
                            <ParticleRing />

                            {/* Inner orb */}
                            <motion.div
                                className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center"
                                style={{
                                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    boxShadow: "0 0 30px rgba(99,102,241,0.3)",
                                }}
                                animate={{ boxShadow: ["0 0 20px rgba(99,102,241,0.2)", "0 0 40px rgba(99,102,241,0.4)", "0 0 20px rgba(99,102,241,0.2)"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Cpu size={22} className="text-white" strokeWidth={1.5} />
                            </motion.div>

                            {/* Outer ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full border border-indigo-300/20"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            />
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="mt-3 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                    >
                        <p className="text-xs md:text-sm font-heading font-bold text-gray-700">Clawgency</p>
                        <p className="text-[10px] md:text-[11px] font-body text-gray-400">AI Agent</p>
                    </motion.div>
                </div>

                {/* ── ARROW 2 ── */}
                <div className="absolute right-[28%] md:right-[30%] top-1/2 -translate-y-1/2 z-10 hidden sm:block">
                    <FlowArrow delay={2.0} />
                </div>

                {/* ── INFLUENCER (Right) ── */}
                <div className="flex flex-col items-center relative">
                    <CloudBubble
                        text="Accepted ✔"
                        color="#10b981"
                        delay={2.5}
                        className="-top-14 md:-top-16 left-1/2 -translate-x-1/2"
                    />

                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                    >
                        <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center relative" style={{ background: "rgba(16,185,129,0.06)" }}>
                            {/* Phone */}
                            <div className="relative">
                                <div className="w-8 h-14 md:w-10 md:h-16 rounded-xl border-2 border-emerald-300/40 bg-white/80 flex flex-col items-center justify-center gap-1">
                                    {/* Screen content */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 2.5, duration: 0.4, type: "spring" }}
                                    >
                                        <Check size={14} className="text-emerald-500" strokeWidth={3} />
                                    </motion.div>
                                    <div className="w-4 h-[2px] bg-emerald-200 rounded-full" />
                                </div>
                                {/* Home button */}
                                <div className="w-2 h-[3px] bg-emerald-200/60 rounded-full mx-auto mt-0.5" />
                            </div>

                            {/* Soft glow */}
                            <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: "0 0 40px rgba(16,185,129,0.1)" }} />
                        </div>
                    </motion.div>

                    <motion.p
                        className="mt-3 text-xs md:text-sm font-heading font-bold text-gray-700 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.5 }}
                    >
                        Influencer
                    </motion.p>
                </div>
            </div>
        </section>
    );
}
