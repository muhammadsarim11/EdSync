"use client";

import type { ReactNode } from "react";
import type { Role } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (user?.role !== role) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-16">
        You don&apos;t have access to this page.
      </div>
    );
  }

  return <>{children}</>;
}
