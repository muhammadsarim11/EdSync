"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ApiError, createCohort, listCohorts, listUsers } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const createCohortSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  instructorId: z.string().min(1, "Choose an instructor."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional(),
});

type CreateCohortValues = z.infer<typeof createCohortSchema>;

function CreateCohortDialog() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: instructorsData } = useQuery({
    queryKey: ["users", "Instructor"],
    queryFn: () => listUsers({ role: "Instructor" }),
    enabled: open,
  });
  const instructors = instructorsData?.data.users ?? [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCohortValues>({
    resolver: zodResolver(createCohortSchema),
  });

  const onSubmit = async (values: CreateCohortValues) => {
    setServerError(null);
    try {
      await createCohort({
        title: values.title,
        description: values.description,
        instructorId: values.instructorId,
        startDate: new Date(values.startDate).toISOString(),
        endDate: values.endDate
          ? new Date(values.endDate).toISOString()
          : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["cohorts"] });
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
      <DialogTrigger render={<Button />}>Create cohort</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a cohort</DialogTitle>
          <DialogDescription>Assign an instructor to own it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <FormField
            label="Title"
            htmlFor="cohort-title"
            error={errors.title?.message}
          >
            <Input id="cohort-title" {...register("title")} />
          </FormField>

          <FormField
            label="Description"
            htmlFor="cohort-description"
            error={errors.description?.message}
          >
            <Textarea id="cohort-description" {...register("description")} />
          </FormField>

          <FormField
            label="Instructor"
            htmlFor="cohort-instructor"
            error={errors.instructorId?.message}
          >
            <Controller
              control={control}
              name="instructorId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cohort-instructor" className="w-full">
                    <SelectValue placeholder="Choose an instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.name} ({instructor.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Start date"
              htmlFor="cohort-start"
              error={errors.startDate?.message}
            >
              <Input id="cohort-start" type="date" {...register("startDate")} />
            </FormField>
            <FormField
              label="End date"
              htmlFor="cohort-end"
              error={errors.endDate?.message}
            >
              <Input id="cohort-end" type="date" {...register("endDate")} />
            </FormField>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating…" : "Create cohort"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CohortsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: listCohorts,
  });
  const cohorts = data?.data.cohorts ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cohorts</h1>
        {user?.role === "InstituteAdmin" && <CreateCohortDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All cohorts</CardTitle>
          <CardDescription>
            {user?.role === "InstituteAdmin"
              ? "Every cohort in your organization."
              : user?.role === "Instructor"
                ? "Cohorts you own."
                : "Cohorts you're enrolled in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : cohorts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No cohorts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => (
                  <TableRow key={cohort.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/cohorts/${cohort.id}`}
                        className="hover:underline"
                      >
                        {cohort.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cohort.status === "Active" ? "default" : "secondary"
                        }
                      >
                        {cohort.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(cohort.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {cohort.endDate
                        ? new Date(cohort.endDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
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
