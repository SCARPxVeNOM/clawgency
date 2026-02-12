"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { NavSidebar } from "@/components/NavSidebar";

import { BackgroundEffects } from "@/components/home/BackgroundEffects";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isHomePage = pathname === "/";
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <BackgroundEffects />
        <main className="w-full max-w-lg relative z-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundEffects />

      {/* Hamburger Toggle Button */}
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

      {/* Desktop Sidebar */}
      <NavSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div
        className={`relative z-10 transition-all duration-300 ${sidebarOpen ? "lg:pl-[260px]" : "lg:pl-0"}`}
      >
        <main
          className={`mx-auto w-full min-h-screen py-10 px-6 ${isHomePage ? "max-w-[960px]" : "max-w-[720px]"
            }`}
        >
          {children}
        </main>
      </div>

    </div>
  );
}
