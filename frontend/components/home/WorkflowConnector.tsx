"use client";

import { motion } from "framer-motion";

export function WorkflowConnector() {
    return (
        <div className="hidden md:flex justify-center items-center my-2 -mt-2">
            <motion.svg
                width="700"
                height="50"
                viewBox="0 0 700 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
            >
                <defs>
                    <linearGradient id="flowGradient" x1="0" y1="0" x2="700" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#facc15" />
                    </linearGradient>
                </defs>

                {/* Background line */}
                <path
                    d="M80 25 L280 25 M420 25 L620 25"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                />

                {/* Animated gradient line */}
                <motion.path
                    d="M80 25 L280 25"
                    stroke="url(#flowGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 1.0, ease: "easeInOut" }}
                />
                <motion.path
                    d="M420 25 L620 25"
                    stroke="url(#flowGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 1.3, ease: "easeInOut" }}
                />

                {/* Arrow heads */}
                <motion.polygon
                    points="275,18 290,25 275,32"
                    fill="#22c55e"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.0 }}
                />
                <motion.polygon
                    points="615,18 630,25 615,32"
                    fill="#facc15"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.3 }}
                />

                {/* Flow dots */}
                <motion.circle
                    r="4"
                    fill="#3b82f6"
                    animate={{
                        cx: [80, 280],
                        cy: [25, 25],
                    }}
                    transition={{
                        duration: 2,
                        delay: 2.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: "easeInOut",
                    }}
                />
                <motion.circle
                    r="4"
                    fill="#22c55e"
                    animate={{
                        cx: [420, 620],
                        cy: [25, 25],
                    }}
                    transition={{
                        duration: 2,
                        delay: 3.0,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: "easeInOut",
                    }}
                />

                {/* Labels */}
                <text x="180" y="12" textAnchor="middle" className="fill-gray-400 text-[9px] font-bold uppercase tracking-widest">
                    Escrow Flow
                </text>
                <text x="520" y="12" textAnchor="middle" className="fill-gray-400 text-[9px] font-bold uppercase tracking-widest">
                    Verification
                </text>
            </motion.svg>
        </div>
    );
}
