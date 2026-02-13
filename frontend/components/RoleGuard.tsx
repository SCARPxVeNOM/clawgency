"use client";

import NextLink from "next/link";
import { useSession, type AppRole } from "@/context/SessionContext";
import { Card, CardBody } from "@heroui/react";

type RoleGuardProps = {
  allow: AppRole[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role, isConnected, isRegistered, isAdminWallet, isProfileLoading } = useSession();

  if (isConnected && !isAdminWallet && isProfileLoading) {
    return (
      <Card className="bg-default-50 border-default-200" shadow="sm">
        <CardBody className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-default-500">Checking Profile</p>
          <p className="text-lg font-bold text-default-900 mt-1">Loading registration status</p>
        </CardBody>
      </Card>
    );
  }

  if (isConnected && !isRegistered && !isAdminWallet) {
    return (
      <Card className="bg-warning-50 border-warning-200" shadow="sm">
        <CardBody className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warning-700">Registration Required</p>
          <p className="text-lg font-bold text-warning-900 mt-1">Complete your profile first</p>
          <p className="mt-2 text-warning-800 font-medium text-sm">
            Register with your role, social accounts, and email before using this page.
          </p>
          <NextLink
            href="/register"
            className="inline-flex mt-4 px-3 py-2 rounded-lg text-xs font-bold bg-warning-100 text-warning-800 hover:bg-warning-200 transition-colors"
          >
            Go to Registration
          </NextLink>
        </CardBody>
      </Card>
    );
  }

  if (!allow.includes(role)) {
    return (
      <Card className="bg-warning-50 border-warning-200" shadow="sm">
        <CardBody className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warning-700">Access Restricted</p>
          <p className="text-lg font-bold text-warning-900 mt-1">Wrong role</p>
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
