"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, createQuestion, listQuestions } from "@/lib/api";

const questionSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  body: z.string().trim().min(1, "Body is required."),
});

function AskQuestionDialog({ cohortId }: { cohortId: string }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
  });

  const onSubmit = async (values: z.infer<typeof questionSchema>) => {
    setServerError(null);
    try {
      await createQuestion(cohortId, values);
      await queryClient.invalidateQueries({
        queryKey: ["questions", cohortId],
      });
      reset();
      setOpen(false);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Ask a question</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask a question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Title"
            htmlFor="question-title"
            error={errors.title?.message}
          >
            <Input id="question-title" {...register("title")} />
          </FormField>
          <FormField
            label="Details"
            htmlFor="question-body"
            error={errors.body?.message}
          >
            <Textarea id="question-body" {...register("body")} />
          </FormField>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Posting…" : "Post question"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CohortQuestionsPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["questions", params.id],
    queryFn: () => listQuestions(params.id),
  });
  const questions = data?.data.questions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Questions</h1>
        <AskQuestionDialog cohortId={params.id} />
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : questions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No questions yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((question) => (
            <Link key={question.id} href={`/questions/${question.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{question.title}</CardTitle>
                  <Badge
                    variant={
                      question.status === "Open" ? "default" : "secondary"
                    }
                  >
                    {question.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {question.body}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {question.replies.length}{" "}
                    {question.replies.length === 1 ? "reply" : "replies"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
