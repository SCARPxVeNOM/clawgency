"use client";

export function BackgroundEffects() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
            {/* Single uniform background — no gradients, no orbs */}
            <div className="absolute inset-0" style={{ background: "#eef0ff" }} />

            {/* Subtle dot grid for texture */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ opacity: 0.025 }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                        <circle cx="1.5" cy="1.5" r="1" fill="#6366f1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotgrid)" />
            </svg>
        </div>
    );
}
