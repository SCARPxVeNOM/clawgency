"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, User, ShieldCheck, Heart, LogIn } from "lucide-react";
import { useSession } from "@/context/SessionContext";


const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Heart },
  { href: "/brand/dashboard", label: "Brand", icon: LayoutDashboard },
  { href: "/influencer/dashboard", label: "Creator", icon: User },
  { href: "/admin/analytics", label: "Admin", icon: ShieldCheck, adminOnly: true },
  { href: "/login", label: "Login", icon: LogIn },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAdminWallet } = useSession();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-divider pt-1 pb-safe px-2 lg:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = item.adminOnly && !isAdminWallet;
          const Icon = item.icon;

          if (isDisabled) return null;

          return (
            <NextLink
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl transition-all font-medium text-[10px] min-w-[60px] ${isActive
                ? "text-primary"
                : "text-default-500 hover:text-default-800"
                }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </NextLink>
          );
        })}
      </div>
    </nav>
  );
}
