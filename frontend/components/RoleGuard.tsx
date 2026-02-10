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
      <div className="section-card p-5 text-sm text-amber-800">
        <p className="font-semibold">Restricted Role View</p>
        <p className="mt-1">
          This page is restricted for role: <strong>{role}</strong>. Switch roles from the top bar.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
