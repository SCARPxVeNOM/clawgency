"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  Compass,
  Home,
  IdCard,
  LayoutDashboard,
  Shield,
  ShieldCheck,
  User,
  UserCircle,
  Wallet,
  X
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession, type AppRole } from "@/context/SessionContext";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/campaigns/explore", label: "Explore", icon: Compass },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/register", label: "Profile", icon: IdCard },
  { href: "/brand/dashboard", label: "Brand", icon: LayoutDashboard, impliedRole: "brand" as AppRole },
  { href: "/influencer/dashboard", label: "Creator", icon: User, impliedRole: "influencer" as AppRole },
  { href: "/admin/analytics", label: "Admin", icon: ShieldCheck, adminOnly: true, impliedRole: "admin" as AppRole }
];

const roles: { value: AppRole; label: string; icon: React.ElementType; color: string }[] = [
  { value: "brand", label: "Brand", icon: Building2, color: "#6366f1" },
  { value: "influencer", label: "Creator", icon: UserCircle, color: "#10b981" },
  { value: "admin", label: "Admin", icon: Shield, color: "#f59e0b" }
];

interface NavSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavSidebar({ isOpen, onClose }: NavSidebarProps) {
  const pathname = usePathname();
  const { role, setRole, isAdminWallet, isConnected, isRegistered, isProfileLoading, profile } = useSession();

  const showRegistrationPrompt = isConnected && !isRegistered && !isAdminWallet && !isProfileLoading;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[260px] flex-col flex
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="absolute inset-0 glass-strong rounded-r-3xl" />

        <div className="relative flex flex-col h-full">
          <div className="px-7 pt-8 pb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/123.png" alt="Clawgency" className="w-10 h-10 rounded-xl shadow-glow-indigo object-cover" />
              <div>
                <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900">Clawgency</h1>
                <p className="text-[10px] font-body font-medium uppercase tracking-[0.15em] text-gray-400">AI Agency Platform</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors lg:hidden">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {profile && (
            <div className="px-4 mb-4">
              <div className="rounded-2xl border border-gray-100 bg-white/60 p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                  {profile.avatarDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarDataUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-heading font-bold text-gray-900 truncate">{profile.displayName}</p>
                  <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 mt-0.5">{profile.role}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 mb-4">
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400 px-3 mb-2">Switch Role</p>

            {!isConnected ? (
              <div className="rounded-xl border border-gray-100 bg-white/50 px-3 py-2 text-[11px] text-gray-500 font-medium">
                Connect wallet to enable role controls.
              </div>
            ) : isProfileLoading && !isAdminWallet ? (
              <div className="rounded-xl border border-gray-100 bg-white/50 px-3 py-2 text-[11px] text-gray-500 font-medium">
                Checking registration status...
              </div>
            ) : showRegistrationPrompt ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 font-medium space-y-1">
                <p>Complete registration to unlock dashboards.</p>
                <NextLink href="/register" onClick={onClose} className="font-bold underline underline-offset-2">
                  Open registration
                </NextLink>
              </div>
            ) : (
              <div className="flex gap-1 p-1 rounded-xl bg-white/50 border border-gray-100">
                {roles.map((entry) => {
                  if (entry.value === "admin" && !isAdminWallet) {
                    return null;
                  }

                  if (profile && !isAdminWallet && entry.value !== profile.role) {
                    return null;
                  }

                  const Icon = entry.icon;
                  const isActive = role === entry.value;

                  return (
                    <button
                      key={entry.value}
                      onClick={() => setRole(entry.value)}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-body font-semibold transition-all
                        ${isActive ? "text-white shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-white/60"}
                      `}
                      style={isActive ? { background: entry.color } : {}}
                    >
                      <Icon size={13} strokeWidth={2.5} />
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdminWallet) {
                return null;
              }

              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (item.impliedRole && item.impliedRole !== role) {
                      setRole(item.impliedRole);
                    }
                    onClose();
                  }}
                  className={`
                    group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-body font-medium
                    transition-all duration-200 relative
                    ${isActive ? "bg-indigo-500/10 text-indigo-600" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"}
                  `}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors ${isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-600"}`}
                  />
                  <span>{item.label}</span>
                </NextLink>
              );
            })}
          </nav>

          <div className="px-4 pb-6">
            <div className="border border-gray-100 rounded-2xl p-4 bg-white/40 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
                    <Wallet size={13} className="text-indigo-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-[10px] font-body font-bold uppercase tracking-[0.15em] text-gray-400">Wallet</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="rainbow-btn-wrapper">
                <ConnectButton showBalance={true} accountStatus="full" chainStatus="icon" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
