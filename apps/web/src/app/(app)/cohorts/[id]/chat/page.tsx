"use client";

import { useParams } from "next/navigation";
import { CohortChatPanel } from "@/components/cohort-chat-panel";

export default function CohortChatPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-semibold">Chat</h1>
      <CohortChatPanel cohortId={params.id} />
    </div>
  );
}
