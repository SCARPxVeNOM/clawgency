"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";

const roleOptions = [
  { role: "brand", label: "Brand" },
  { role: "influencer", label: "Influencer" },
  { role: "admin", label: "Admin" }
] as const;

const navItems = [
  { href: "/login", label: "Login" },
  { href: "/brand/dashboard", label: "Brand" },
  { href: "/influencer/dashboard", label: "Influencer" },
  { href: "/admin/analytics", label: "Admin" }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, setRole, isAdminWallet } = useSession();
  const pathname = usePathname();

  return (
    <div className="app-container">
      <header className="hero-shell reveal-up">
        <span className="hero-orb hero-orb-a" aria-hidden />
        <span className="hero-orb hero-orb-b" aria-hidden />

        <div className="hero-top">
          <div>
            <p className="hero-kicker">Clawgency Slot 2</p>
            <h1 className="hero-title">AI-Powered On-Chain Influencer Agency</h1>
            <p className="hero-subline">Professional workflows, auditable decisions, human-approved transactions.</p>
          </div>
          <ConnectButton />
        </div>

        <nav className="nav-strip">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} className={`nav-pill ${active ? "nav-pill-active" : ""}`} href={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="role-strip">
          {roleOptions.map((item) => {
            const disabled = item.role === "admin" && !isAdminWallet;
            return (
              <button
                key={item.role}
                disabled={disabled}
                onClick={() => setRole(item.role)}
                className={`role-pill ${role === item.role ? "role-pill-active" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>
      <main className="mt-6 reveal-up reveal-delay-1">{children}</main>
    </div>
  );
}
