"use client";

import { useSession, type AppRole } from "@/context/SessionContext";

type RoleGuardProps = {
  allow: AppRole[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role } = useSession();
  if (!allow.includes(role)) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        This page is restricted for role: <strong>{role}</strong>. Switch roles from the top bar.
      </div>
    );
  }
  return <>{children}</>;
}
