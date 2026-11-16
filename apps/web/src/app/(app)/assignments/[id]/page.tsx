"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiError,
  deleteAssignment,
  getAssignment,
  getCohort,
  gradeSubmission,
  listSubmissions,
  submitAssignment,
  type Submission,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

// -- Student submission form --------------------------------------------------

const submitSchema = z.object({
  fileUrl: z.string().trim().url("Enter a valid URL."),
});

function SubmitForm({ assignmentId }: { assignmentId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof submitSchema>>({
    resolver: zodResolver(submitSchema),
  });

  const onSubmit = async (values: z.infer<typeof submitSchema>) => {
    setServerError(null);
    try {
      await submitAssignment(assignmentId, values.fileUrl);
      await queryClient.invalidateQueries({
        queryKey: ["submissions", assignmentId],
      });
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit your work</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Submission URL"
            htmlFor="submit-url"
            error={errors.fileUrl?.message}
          >
            <Input
              id="submit-url"
              placeholder="https://github.com/you/repo"
              {...register("fileUrl")}
            />
          </FormField>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MySubmission({ submission }: { submission: Submission }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your submission</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p>
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {submission.fileUrl}
          </a>
        </p>
        <div className="flex items-center gap-2">
          <Badge
            variant={submission.status === "Graded" ? "default" : "secondary"}
          >
            {submission.status}
          </Badge>
          {submission.obtainedMarks !== null && (
            <span>{submission.obtainedMarks} marks</span>
          )}
        </div>
        {submission.feedback && (
          <p className="text-muted-foreground">{submission.feedback}</p>
        )}
      </CardContent>
    </Card>
  );
}

// -- Staff grading table --------------------------------------------------------

const gradeSchema = z.object({
  obtainedMarks: z
    .string()
    .refine((v) => v.trim() !== "" && Number(v) >= 0, "Enter a valid number."),
  feedback: z.string().trim().optional(),
});

function GradeDialog({
  submission,
  totalMarks,
}: {
  submission: Submission;
  totalMarks: number;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof gradeSchema>>({
    resolver: zodResolver(gradeSchema),
    values: {
      obtainedMarks:
        submission.obtainedMarks !== null
          ? String(submission.obtainedMarks)
          : "",
      feedback: submission.feedback,
    },
  });

  const onSubmit = async (values: z.infer<typeof gradeSchema>) => {
    setServerError(null);
    try {
      await gradeSubmission(submission.id, {
        obtainedMarks: Number(values.obtainedMarks),
        feedback: values.feedback,
      });
      await queryClient.invalidateQueries({
        queryKey: ["submissions", submission.assignmentId],
      });
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
      <DialogTrigger render={<Button size="sm" />}>
        {submission.status === "Graded" ? "Regrade" : "Grade"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade submission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label={`Marks (out of ${totalMarks})`}
            htmlFor="grade-marks"
            error={errors.obtainedMarks?.message}
          >
            <Input
              id="grade-marks"
              type="number"
              min={0}
              max={totalMarks}
              {...register("obtainedMarks")}
            />
          </FormField>
          <FormField
            label="Feedback"
            htmlFor="grade-feedback"
            error={errors.feedback?.message}
          >
            <Textarea id="grade-feedback" {...register("feedback")} />
          </FormField>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving…" : "Save grade"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsTable({
  assignmentId,
  totalMarks,
}: {
  assignmentId: string;
  totalMarks: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["submissions", assignmentId],
    queryFn: () => listSubmissions(assignmentId),
  });
  const submissions = data?.data.submissions ?? [];

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No submissions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">
                    {submission.student?.name} ({submission.student?.email})
                  </TableCell>
                  <TableCell>
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        submission.status === "Graded" ? "default" : "secondary"
                      }
                    >
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{submission.obtainedMarks ?? "—"}</TableCell>
                  <TableCell>
                    <GradeDialog
                      submission={submission}
                      totalMarks={totalMarks}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// -- Page -----------------------------------------------------------------------

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["assignment", params.id],
    queryFn: () => getAssignment(params.id),
  });
  const assignment = data?.data.assignment;

  const { data: cohortData } = useQuery({
    queryKey: ["cohort", assignment?.cohortId],
    queryFn: () => getCohort(assignment!.cohortId),
    enabled: !!assignment,
  });
  const cohort = cohortData?.data.cohort;

  // Students see only their own submission via this same endpoint, so this
  // one query serves both the student's "my submission" view and the staff
  // grading table below.
  const { data: submissionsData } = useQuery({
    queryKey: ["submissions", params.id],
    queryFn: () => listSubmissions(params.id),
    enabled: !!user && user.role === "Student",
  });
  const mySubmission = submissionsData?.data.submissions[0];

  const removeAssignment = useMutation({
    mutationFn: () => deleteAssignment(params.id),
    onSuccess: async () => {
      if (assignment) {
        await queryClient.invalidateQueries({
          queryKey: ["assignments", assignment.lectureId],
        });
        router.push(`/lectures/${assignment.lectureId}/assignments`);
      }
    },
    onError: (err) => {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!assignment || !user)
    return (
      <p className="text-muted-foreground text-sm">Assignment not found.</p>
    );

  const canManage =
    !!cohort &&
    (user.role === "InstituteAdmin" ||
      (user.role === "Instructor" && cohort.instructorId === user.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{assignment.title}</h1>
          {assignment.description && (
            <p className="text-muted-foreground mt-1">
              {assignment.description}
            </p>
          )}
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-sm">
            <span>Due {new Date(assignment.deadline).toLocaleString()}</span>
            <span>{assignment.totalMarks} marks</span>
            {assignment.attachmentUrl && (
              <a
                href={assignment.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Attachment
              </a>
            )}
          </div>
        </div>
        {canManage && (
          <Button
            variant="ghost"
            disabled={removeAssignment.isPending}
            onClick={() => removeAssignment.mutate()}
          >
            Delete
          </Button>
        )}
      </div>

      {deleteError && (
        <Alert variant="destructive">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      {user.role === "Student" &&
        (mySubmission ? (
          <MySubmission submission={mySubmission} />
        ) : (
          <SubmitForm assignmentId={assignment.id} />
        ))}

      {canManage && (
        <SubmissionsTable
          assignmentId={assignment.id}
          totalMarks={assignment.totalMarks}
        />
      )}
    </div>
  );
}
