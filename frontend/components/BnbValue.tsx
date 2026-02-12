"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Inline BNB value with the gold coin icon.
 * Usage: <BnbValue amount="0.5000 BNB" /> or <BnbValue amount={formatBnb(val)} />
 */
export function BnbValue({ amount, className = "" }: { amount: string; className?: string }) {
    // Strip " BNB" suffix if present — we'll show the coin image instead of text
    const numericPart = amount.replace(/\s*BNB$/i, "");

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span>{numericPart}</span>
            <img
                src="/1839.png"
                alt="BNB"
                className="inline-block select-none flex-shrink-0"
                style={{ width: "1em", height: "1em", verticalAlign: "middle", objectFit: "contain" }}
                draggable={false}
            />
        </span>
    );
}
