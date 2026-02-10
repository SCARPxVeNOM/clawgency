"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "@/context/SessionContext";

export default function LoginPage() {
  const { role, setRole, walletAddress, isConnected, isAdminWallet } = useSession();

  return (
    <section className="section-card reveal-up p-6">
      <h2 className="text-xl font-semibold text-ink">Wallet Login</h2>
      <p className="card-subtitle">
        Connect your wallet, then choose the role-specific dashboard you want to operate.
      </p>

      <div className="mt-4">
        <ConnectButton />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Connected wallet</p>
        <p className="mt-1 break-all text-sm text-ink">{walletAddress ?? "Not connected"}</p>
        <p className="mt-2 text-xs text-steel">Status: {isConnected ? "Connected" : "Disconnected"}</p>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-steel">Choose Role</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setRole("brand")}
            className={`btn-secondary px-4 py-2 text-sm ${
              role === "brand" ? "role-pill-active !text-white !border-transparent" : ""
            }`}
          >
            Brand
          </button>
          <button
            onClick={() => setRole("influencer")}
            className={`btn-secondary px-4 py-2 text-sm ${
              role === "influencer" ? "role-pill-active !text-white !border-transparent" : ""
            }`}
          >
            Influencer
          </button>
          <button
            disabled={!isAdminWallet}
            onClick={() => setRole("admin")}
            className={`btn-secondary px-4 py-2 text-sm ${
              role === "admin" ? "role-pill-active !text-white !border-transparent" : ""
            }`}
          >
            Admin
          </button>
        </div>
      </div>
    </section>
  );
}
