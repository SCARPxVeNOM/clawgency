"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { NavSidebar } from "@/components/NavSidebar";
import { BackgroundEffects } from "@/components/home/BackgroundEffects";
import { useSession } from "@/context/SessionContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected, isRegistered, isAdminWallet, isProfileLoading } = useSession();

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isAuthPage = isLoginPage || isRegisterPage;
  const isHomePage = pathname === "/";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isConnected || isRegistered || isAdminWallet || isProfileLoading) {
      return;
    }

    const pathIsPublic = pathname === "/" || pathname === "/login" || pathname === "/register";
    if (!pathIsPublic) {
      router.replace("/register");
    }
  }, [isConnected, isRegistered, isAdminWallet, isProfileLoading, pathname, router]);

  const shouldBlockForRegistration =
    isConnected &&
    !isRegistered &&
    !isAdminWallet &&
    !isProfileLoading &&
    pathname !== "/" &&
    pathname !== "/login" &&
    pathname !== "/register";

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <BackgroundEffects />
        <main className="w-full max-w-lg relative z-10">{children}</main>
      </div>
    );
  }

  if (shouldBlockForRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <BackgroundEffects />
        <div className="glass-card rounded-2xl p-6 text-center max-w-md relative z-10">
          <p className="text-[10px] font-body font-bold uppercase tracking-[0.2em] text-indigo-500">Registration Required</p>
          <h2 className="text-xl font-heading font-bold text-gray-900 mt-2">Complete profile setup</h2>
          <p className="text-sm font-body text-gray-500 mt-2">Redirecting to registration page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundEffects />

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
          fixed top-6 z-[60] p-2.5 rounded-xl bg-white/80 backdrop-blur-md border border-gray-100
          shadow-glass hover:shadow-glass-hover transition-all duration-300
          ${sidebarOpen ? "left-[272px] lg:left-[272px]" : "left-5"}
        `}
        aria-label="Toggle sidebar"
      >
        <Menu size={18} className="text-gray-600" strokeWidth={2} />
      </button>

      <NavSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`relative z-10 transition-all duration-300 ${sidebarOpen ? "lg:pl-[260px]" : "lg:pl-0"}`}>
        <main className={`mx-auto w-full min-h-screen py-10 px-6 ${isHomePage ? "max-w-[960px]" : "max-w-[720px]"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
