"use client";

import { motion } from "framer-motion";

export function HeroSection() {
    return (
        <section className="relative text-center pt-8 pb-2">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center"
            >
                {/* Logo */}
                <motion.div
                    className="mb-5"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/123.png"
                        alt="Clawgency Logo"
                        className="w-16 h-16 md:w-20 md:h-20 rounded-3xl shadow-glow-indigo-lg object-cover"
                    />
                </motion.div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-heading">
                    <span className="bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent">
                        Clawgency
                    </span>
                </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
                className="mt-3 text-base md:text-lg text-gray-400 max-w-md mx-auto font-body font-medium leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            >
                AI-Powered Influencer Agency Operations
            </motion.p>
        </section>
    );
}
