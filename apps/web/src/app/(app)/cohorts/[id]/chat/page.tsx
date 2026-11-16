"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useChatSocket } from "@/lib/use-chat-socket";

export default function CohortChatPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { messages, isJoined, error, sendMessage } = useChatSocket(params.id);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSendError(null);
    try {
      await sendMessage(draft.trim());
      setDraft("");
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Could not send message.",
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-semibold">Chat</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle className="text-base">Cohort room</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex max-h-[60vh] min-h-64 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
            {!isJoined && !error && (
              <p className="text-muted-foreground text-sm">Connecting…</p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.senderId === user?.id
                    ? "bg-primary text-primary-foreground self-end rounded-lg px-3 py-1.5 text-sm"
                    : "bg-muted self-start rounded-lg px-3 py-1.5 text-sm"
                }
              >
                {message.senderId !== user?.id && (
                  <div className="text-xs font-medium opacity-70">
                    {message.senderName}
                  </div>
                )}
                {message.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {sendError && (
            <Alert variant="destructive">
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSend} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              disabled={!isJoined}
            />
            <Button type="submit" disabled={!isJoined || !draft.trim()}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
