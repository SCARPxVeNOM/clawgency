"use client";

import { useSession, type AppRole } from "@/context/SessionContext";
import { Card, CardBody } from "@heroui/react";

type RoleGuardProps = {
  allow: AppRole[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role } = useSession();
  if (!allow.includes(role)) {
    return (
      <Card className="bg-warning-50 border-warning-200" shadow="sm">
        <CardBody className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warning-700">⚠️ Access Restricted</p>
          <p className="text-lg font-bold text-warning-900 mt-1">Wrong Role</p>
          <p className="mt-2 text-warning-800 font-medium text-sm">
            This page needs role: <strong>{allow.join(" or ")}</strong>. You are: <strong>{role}</strong>.
            Switch from the sidebar.
          </p>
        </CardBody>
      </Card>
    );
  }
  return <>{children}</>;
}
