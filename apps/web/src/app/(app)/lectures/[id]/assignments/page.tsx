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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createAssignment,
  getCohort,
  getLecture,
  listAssignments,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const assignmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  attachmentUrl: z.string().trim().optional(),
  deadline: z.string().min(1, "Deadline is required."),
  totalMarks: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isInteger(Number(v)) && Number(v) > 0),
      "Must be a positive number.",
    ),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

function CreateAssignmentDialog({ lectureId }: { lectureId: string }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
  });

  const onSubmit = async (values: AssignmentFormValues) => {
    setServerError(null);
    try {
      await createAssignment(lectureId, {
        title: values.title,
        description: values.description,
        attachmentUrl: values.attachmentUrl,
        deadline: new Date(values.deadline).toISOString(),
        totalMarks: values.totalMarks ? Number(values.totalMarks) : undefined,
      });
      await queryClient.invalidateQueries({
        queryKey: ["assignments", lectureId],
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
      <DialogTrigger render={<Button />}>Create assignment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Title"
            htmlFor="assignment-title"
            error={errors.title?.message}
          >
            <Input id="assignment-title" {...register("title")} />
          </FormField>
          <FormField
            label="Description"
            htmlFor="assignment-description"
            error={errors.description?.message}
          >
            <Textarea
              id="assignment-description"
              {...register("description")}
            />
          </FormField>
          <FormField
            label="Attachment URL"
            htmlFor="assignment-attachment"
            error={errors.attachmentUrl?.message}
          >
            <Input id="assignment-attachment" {...register("attachmentUrl")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Deadline"
              htmlFor="assignment-deadline"
              error={errors.deadline?.message}
            >
              <Input
                id="assignment-deadline"
                type="datetime-local"
                {...register("deadline")}
              />
            </FormField>
            <FormField
              label="Total marks"
              htmlFor="assignment-marks"
              error={errors.totalMarks?.message}
            >
              <Input
                id="assignment-marks"
                type="number"
                min={1}
                placeholder="100"
                {...register("totalMarks")}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating…" : "Create assignment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LectureAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: lectureData, isLoading: lectureLoading } = useQuery({
    queryKey: ["lecture", params.id],
    queryFn: () => getLecture(params.id),
  });
  const lecture = lectureData?.data.lecture;

  const { data: cohortData } = useQuery({
    queryKey: ["cohort", lecture?.cohortId],
    queryFn: () => getCohort(lecture!.cohortId),
    enabled: !!lecture,
  });
  const cohort = cohortData?.data.cohort;

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", params.id],
    queryFn: () => listAssignments(params.id),
  });
  const assignments = data?.data.assignments ?? [];

  const canManage =
    !!user &&
    !!cohort &&
    (user.role === "InstituteAdmin" ||
      (user.role === "Instructor" && cohort.instructorId === user.id));

  if (lectureLoading || isLoading) return <Skeleton className="h-64 w-full" />;
  if (!lecture)
    return <p className="text-muted-foreground text-sm">Lecture not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {lecture.title} — Assignments
        </h1>
        {canManage && <CreateAssignmentDialog lectureId={lecture.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Sorted by deadline.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No assignments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Total marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/assignments/${assignment.id}`}
                        className="hover:underline"
                      >
                        {assignment.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.deadline).toLocaleString()}
                    </TableCell>
                    <TableCell>{assignment.totalMarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
