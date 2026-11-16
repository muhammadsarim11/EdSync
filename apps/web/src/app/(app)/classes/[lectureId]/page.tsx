"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CohortChatPanel } from "@/components/cohort-chat-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  endLiveClass,
  getLecture,
  joinLiveClass,
  startLiveClass,
} from "@/lib/api";

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error
    ? err.message
    : "Something went wrong. Please try again.";
}

export default function LiveClassPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const queryClient = useQueryClient();

  const lectureQuery = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: () => getLecture(lectureId),
    // Students waiting for the instructor to start: check again every 10s.
    refetchInterval: (query) =>
      query.state.data?.data.lecture.liveStatus === "live" ? false : 10_000,
  });
  const lecture = lectureQuery.data?.data.lecture;

  const start = useMutation({
    mutationFn: () => startLiveClass(lectureId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["lecture", lectureId] }),
  });
  const join = useMutation({ mutationFn: () => joinLiveClass(lectureId) });
  const end = useMutation({
    mutationFn: () => endLiveClass(lectureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecture", lectureId] });
      queryClient.invalidateQueries({ queryKey: ["lectures"] });
    },
  });

  // Join automatically once the class is live (the token is minted per join).
  const isLive = lecture?.liveStatus === "live";
  const { mutate: joinMutate, isIdle: joinIdle } = join;
  const startData = start.data;
  useEffect(() => {
    if (isLive && joinIdle && !startData) joinMutate();
  }, [isLive, joinIdle, joinMutate, startData]);

  // Only trust a join while the class is live (it may have just been ended).
  const session = isLive
    ? (start.data?.data.join ?? join.data?.data.join)
    : undefined;

  if (lectureQuery.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!lecture) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Class not found.</AlertDescription>
      </Alert>
    );
  }

  const error = start.error ?? join.error ?? end.error;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link
            href={`/cohorts/${lecture.cohortId}`}
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            Back to cohort
          </Link>
          <h1 className="text-2xl font-semibold">{lecture.title}</h1>
        </div>
        {session?.isOwner && (
          <Button
            variant="destructive"
            disabled={end.isPending}
            onClick={() => end.mutate()}
          >
            {end.isPending ? "Ending…" : "End class"}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="bg-muted flex aspect-video min-h-80 items-center justify-center overflow-hidden rounded-lg border">
          {session ? (
            <iframe
              title={lecture.title}
              src={`${session.roomUrl}?t=${session.token}`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="size-full"
            />
          ) : lecture.liveStatus === "ended" ? (
            <p className="text-muted-foreground text-sm">
              This class has ended.
            </p>
          ) : isLive ? (
            <p className="text-muted-foreground text-sm">Joining…</p>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-muted-foreground text-sm">
                The class has not started yet.
              </p>
              <StartButton
                pending={start.isPending}
                onStart={() => start.mutate()}
              />
            </div>
          )}
        </div>

        <CohortChatPanel
          cohortId={lecture.cohortId}
          title="Class chat"
          messagesClassName="h-80 lg:h-[28rem]"
        />
      </div>
    </div>
  );
}

function StartButton({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: () => void;
}) {
  return (
    <Button disabled={pending} onClick={onStart}>
      {pending ? "Starting…" : "Start class"}
    </Button>
  );
}
