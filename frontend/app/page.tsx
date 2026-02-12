"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

const LINE1 = "AI Meets Escrow for";
const LINE2 = "Influencer Campaigns";

function TypewriterHeading() {
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const startDelay = setTimeout(() => setStarted(true), 400);
    return () => clearTimeout(startDelay);
  }, [isInView]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const total = LINE1.length + LINE2.length;
    const interval = setInterval(() => {
      if (i < LINE1.length) {
        setText1(LINE1.slice(0, i + 1));
      } else {
        setText2(LINE2.slice(0, i - LINE1.length + 1));
      }
      i++;
      if (i >= total) clearInterval(interval);
    }, 70);
    return () => clearInterval(interval);
  }, [started]);

  // Blinking cursor
  useEffect(() => {
    const blink = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <h2
      ref={ref}
      className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold leading-tight min-h-[2.8em]"
    >
      <span className="bg-gradient-to-r from-gray-900 via-indigo-800 to-gray-900 bg-clip-text text-transparent">
        {text1}
      </span>
      {text1.length === LINE1.length && text2.length === 0 && <br />}
      {text2.length > 0 && <br />}
      <span className="bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 bg-clip-text text-transparent">
        {text2}
      </span>
      <span
        className="inline-block w-[3px] h-[0.8em] bg-indigo-500 ml-1 align-baseline rounded-full"
        style={{ opacity: showCursor ? 1 : 0 }}
      />
    </h2>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] relative">

      {/* ─── Main Illustration ─── */}
      <div className="relative w-full max-w-[900px] mx-auto">

        {/* The ee.png image — full visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ee.png"
            alt="Clawgency — Brand → AI Agent → Influencer visual flow"
            className="w-full h-auto object-contain select-none"
            draggable={false}
          />
        </motion.div>

        {/* ═══════════════════════════════════════
            Animated overlays on top of the image
            ═══════════════════════════════════════ */}

        {/* ── AI Agent Pulse Glow (center, behind the robot — dense & dark) ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%)" }}
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-40 h-40 md:w-56 md:h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,70,220,0.35) 0%, rgba(139,92,246,0.18) 40%, transparent 70%)" }} />
        </motion.div>

        {/* ── Particle Ring around AI Agent ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "38%", left: "50%", width: "120px", height: "120px", marginLeft: "-60px", marginTop: "-60px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[0, 72, 144, 216, 288].map((deg) => (
            <motion.div
              key={deg}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(139,92,246,0.5)",
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateY(-55px)`,
              }}
              animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.7, 1.3, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: deg / 400 }}
            />
          ))}
        </motion.div>

        {/* ── Brand Cloud Fade-In (top-left area) ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "18%", left: "5%" }}
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }}
        >
          {/* Subtle highlight shimmer over the cloud */}
          <motion.div
            className="w-36 h-16 md:w-44 md:h-20 rounded-2xl"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), transparent)" }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>



        {/* ── Arrow Light Travel (left → right, middle area) ── */}
        <motion.div
          className="absolute pointer-events-none hidden sm:block"
          style={{ top: "52%", left: "30%", right: "30%", height: "2px" }}
        >
          <motion.div
            className="absolute top-0 left-0 w-12 md:w-20 h-full rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(56, 63, 189, 0.9), transparent)" }}
            animate={{ x: ["-20%", "500%"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear", delay: 1.8 }}
          />
        </motion.div>

        {/* ── Accepted Cloud Bounce-In (top-right area) ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "15%", right: "8%" }}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.5, type: "spring", stiffness: 200 }}
        >
          {/* Green glow behind the accepted cloud */}
          <motion.div
            className="w-28 h-14 md:w-36 md:h-16 rounded-2xl"
            style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.1), transparent)" }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* ── Checkmark Bounce on Influencer Side ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: "18%", right: "14%" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.4, type: "spring", stiffness: 300 }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Floating BNB Coins (two big ones, left & right) ── */}
        {[
          { top: "75%", left: "3%", delay: 0, size: 50 },
          { top: "72%", right: "3%", delay: 1.2, size: 50 },
        ].map((coin, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ top: coin.top, left: coin.left, right: coin.right }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: coin.delay }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/what-is-bnb-and-bnb-smart-chain_new.webp"
              alt="BNB"
              className="select-none opacity-90 drop-shadow-sm"
              style={{ width: `${coin.size}px`, height: `${coin.size}px` }}
              draggable={false}
            />
          </motion.div>
        ))}

        {/* ── Radial Spotlight behind AI Agent ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ═══════════════════════════════════════
          Project Explanation Section
          ═══════════════════════════════════════ */}
      <div className="w-full relative mt-16 md:mt-24 rounded-full">
        {/* ── Floating Decorative Images in Page Margins ── */}
        {/* clawbot on the left blank space */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/456.png"
          alt=""
          className="hidden xl:block absolute select-none drop-shadow-lg z-10 rounded-full"
          style={{ left: "2%", top: "40px", width: "150px", height: "150px", objectFit: "cover" }}
          draggable={false}
        />
        {/* 456 on the right blank space */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/clawbot.png"
          alt=""
          className="hidden xl:block absolute select-none drop-shadow-lg z-10 rounded-full"
          style={{ right: "2%", top: "40px", width: "150px", height: "150px", objectFit: "cover" }}
          draggable={false}
        />

        <section className="relative w-full max-w-[860px] mx-auto px-4 space-y-16">


          {/* ── Section Heading ── */}
          <div className="text-center space-y-4">
            <motion.p
              className="text-[11px] font-body font-bold uppercase tracking-[0.25em] text-indigo-500"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              How Clawgency Works
            </motion.p>

            {/* Typewriter heading */}
            <TypewriterHeading />

            <motion.p
              className="text-base md:text-lg font-body text-gray-400 max-w-lg mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 3.5 }}
            >
              Clawgency automates the entire brand–influencer workflow on-chain — from campaign creation to milestone-based payouts — with an AI agent orchestrating every step.
            </motion.p>
          </div>

          {/* ── Three Steps ── */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Create Campaign",
                desc: "Brands define milestones, set a BNB budget, and our AI agent analyzes the brief to suggest optimal payout structures.",
                color: "#6366f1",
                bg: "rgba(99,102,241,0.06)",
              },
              {
                step: "02",
                title: "AI Orchestrates",
                desc: "The Clawgency AI Agent matches creators, drafts proposals, and manages the smart-contract escrow — fully autonomous.",
                color: "#8b5cf6",
                bg: "rgba(139,92,246,0.06)",
              },
              {
                step: "03",
                title: "Secure Payout",
                desc: "Funds release milestone‑by‑milestone through BNBChain escrow. Brands approve, influencers get paid — zero trust issues.",
                color: "#10b981",
                bg: "rgba(16,185,129,0.06)",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass-card rounded-2xl p-6 space-y-4 hover:shadow-glass-hover transition-shadow duration-300"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-heading font-bold"
                  style={{ background: item.bg, color: item.color }}
                >
                  {item.step}
                </div>
                <h3 className="text-lg font-heading font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm font-body text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── Key Highlights ── */}
          <div className="glass-card rounded-3xl p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-heading font-bold text-gray-900">
                  Why On‑Chain Escrow?
                </h3>
                <p className="text-sm font-body text-gray-500 leading-relaxed">
                  Traditional influencer payments rely on trust and invoices. Clawgency replaces that with <span className="font-semibold text-gray-700">BNBChain smart contracts</span> — funds are locked in escrow and released only when milestones are approved, protecting both brands and creators.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-heading font-bold text-gray-900">
                  AI‑Native Workflow
                </h3>
                <p className="text-sm font-body text-gray-500 leading-relaxed">
                  Our AI agent doesn&apos;t just match — it <span className="font-semibold text-gray-700">drafts proposals, splits budgets into milestones, and monitors campaign progress</span>. Think of it as a full agency operations team, automated.
                </p>
              </div>
            </div>
          </div>

          {/* ── Bottom Spacer ── */}
          <div className="h-8" />
        </section>
      </div>
    </div>
  );
}
