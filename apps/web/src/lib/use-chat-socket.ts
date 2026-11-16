"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

export type ChatMessage = {
  id: string;
  cohortId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
};

type JoinAck =
  | { status: "ok"; history: ChatMessage[] }
  | { status: "error"; message: string };
type SendAck =
  { status: "ok"; message: ChatMessage } | { status: "error"; message: string };

export function useChatSocket(cohortId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect_error", (err) =>
      setError(err.message || "Could not connect to chat."),
    );

    socket.on("connect", () => {
      socket.emit("join-cohort", cohortId, (ack: JoinAck) => {
        if (ack.status === "ok") {
          setMessages(ack.history);
          setIsJoined(true);
        } else {
          setError(ack.message);
        }
      });
    });

    socket.on("new-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [cohortId]);

  const sendMessage = (content: string) => {
    return new Promise<void>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) {
        reject(new Error("Not connected."));
        return;
      }
      socket.emit("send-message", { cohortId, content }, (ack: SendAck) => {
        if (ack.status === "ok") resolve();
        else reject(new Error(ack.message));
      });
    });
  };

  return { messages, isJoined, error, sendMessage };
}
