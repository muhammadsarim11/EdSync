"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiError,
  addReply,
  getCohort,
  getQuestion,
  resolveQuestion,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const replySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty."),
});

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["question", params.id],
    queryFn: () => getQuestion(params.id),
  });
  const question = data?.data.question;

  const { data: cohortData } = useQuery({
    queryKey: ["cohort", question?.cohortId],
    queryFn: () => getCohort(question!.cohortId),
    enabled: !!question,
  });
  const cohort = cohortData?.data.cohort;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
  });

  const onReply = async (values: z.infer<typeof replySchema>) => {
    setServerError(null);
    try {
      await addReply(params.id, values.body);
      await queryClient.invalidateQueries({
        queryKey: ["question", params.id],
      });
      reset();
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const resolve = useMutation({
    mutationFn: () => resolveQuestion(params.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["question", params.id] }),
    onError: (err) => {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!question || !user)
    return <p className="text-muted-foreground text-sm">Question not found.</p>;

  const isAuthor = question.authorId === user.id;
  const isStaffOwner =
    !!cohort &&
    (user.role === "InstituteAdmin" ||
      (user.role === "Instructor" && cohort.instructorId === user.id));
  const canResolve = question.status === "Open" && (isAuthor || isStaffOwner);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{question.title}</h1>
          <p className="text-muted-foreground mt-1">{question.body}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={question.status === "Open" ? "default" : "secondary"}>
            {question.status}
          </Badge>
          {canResolve && (
            <Button
              size="sm"
              variant="outline"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate()}
            >
              Mark resolved
            </Button>
          )}
        </div>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Replies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {question.replies.length === 0 ? (
            <p className="text-muted-foreground text-sm">No replies yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {question.replies.map((reply) => (
                <li key={reply.id} className="rounded-lg border p-3 text-sm">
                  <p>{reply.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(reply.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleSubmit(onReply)}
            className="flex flex-col gap-2"
          >
            <FormField
              label="Add a reply"
              htmlFor="reply-body"
              error={errors.body?.message}
            >
              <Textarea id="reply-body" {...register("body")} />
            </FormField>
            <Button type="submit" disabled={isSubmitting} className="w-fit">
              {isSubmitting ? "Posting…" : "Reply"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
