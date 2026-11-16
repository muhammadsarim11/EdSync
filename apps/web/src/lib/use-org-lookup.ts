"use client";

import { useState } from "react";
import { lookupOrganization } from "@/lib/api";

export function useOrgLookup() {
  const [isResolving, setIsResolving] = useState(false);

  const resolveOrgId = async (slug: string) => {
    setIsResolving(true);
    try {
      const res = await lookupOrganization(slug);
      return res.data.organization.id;
    } finally {
      setIsResolving(false);
    }
  };

  return { resolveOrgId, isResolving };
}
