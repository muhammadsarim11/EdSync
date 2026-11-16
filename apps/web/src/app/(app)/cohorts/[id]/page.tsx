"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  bulkEnroll,
  createLecture,
  createModule,
  deleteCohort,
  deleteLecture,
  deleteModule,
  getCohort,
  getRecordingUploadSignature,
  listEnrollments,
  listLectures,
  listModules,
  listUsers,
  removeEnrollment,
  updateCohort,
  uploadRecordingToCloudinary,
  type Cohort,
  type Lecture,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function canManageCohort(cohort: Cohort, userId: string, role: string) {
  return (
    role === "InstituteAdmin" ||
    (role === "Instructor" && cohort.instructorId === userId)
  );
}

// -- Edit cohort ------------------------------------------------------------

const editCohortSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  status: z.enum(["Upcoming", "Active", "Completed"]),
});

type EditCohortValues = z.infer<typeof editCohortSchema>;

function EditCohortDialog({ cohort }: { cohort: Cohort }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditCohortValues>({
    resolver: zodResolver(editCohortSchema),
    defaultValues: {
      title: cohort.title,
      description: cohort.description ?? "",
      status: cohort.status,
    },
  });

  const onSubmit = async (values: EditCohortValues) => {
    setServerError(null);
    try {
      await updateCohort(cohort.id, values);
      await queryClient.invalidateQueries({ queryKey: ["cohort", cohort.id] });
      await queryClient.invalidateQueries({ queryKey: ["cohorts"] });
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
      <DialogTrigger render={<Button variant="outline" />}>Edit</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit cohort</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Title"
            htmlFor="edit-title"
            error={errors.title?.message}
          >
            <Input id="edit-title" {...register("title")} />
          </FormField>
          <FormField
            label="Status"
            htmlFor="edit-status"
            error={errors.status?.message}
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Add module / lecture dialogs --------------------------------------------

const moduleSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  orderIndex: z
    .string()
    .refine(
      (v) => v.trim() !== "" && Number.isInteger(Number(v)) && Number(v) >= 0,
      "Must be 0 or greater.",
    ),
});

function AddModuleDialog({
  cohortId,
  nextOrderIndex,
}: {
  cohortId: string;
  nextOrderIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof moduleSchema>>({
    resolver: zodResolver(moduleSchema),
    values: { title: "", orderIndex: String(nextOrderIndex) },
  });

  const onSubmit = async (values: z.infer<typeof moduleSchema>) => {
    setServerError(null);
    try {
      await createModule(cohortId, {
        title: values.title,
        orderIndex: Number(values.orderIndex),
      });
      await queryClient.invalidateQueries({ queryKey: ["modules", cohortId] });
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
      <DialogTrigger render={<Button size="sm" />}>Add module</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a module</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Title"
            htmlFor="module-title"
            error={errors.title?.message}
          >
            <Input id="module-title" {...register("title")} />
          </FormField>
          <FormField
            label="Order"
            htmlFor="module-order"
            error={errors.orderIndex?.message}
          >
            <Input
              id="module-order"
              type="number"
              min={0}
              {...register("orderIndex")}
            />
          </FormField>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adding…" : "Add module"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const lectureSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  orderIndex: z
    .string()
    .refine(
      (v) => v.trim() !== "" && Number.isInteger(Number(v)) && Number(v) >= 0,
      "Must be 0 or greater.",
    ),
  type: z.enum(["Live", "Recorded"]),
  videoUrl: z.string().trim().optional(),
  resourceUrl: z.string().trim().optional(),
  durationInMinutes: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0),
      "Must be 0 or greater.",
    ),
});

function AddLectureDialog({
  moduleId,
  nextOrderIndex,
}: {
  moduleId: string;
  nextOrderIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof lectureSchema>>({
    resolver: zodResolver(lectureSchema),
    values: {
      title: "",
      orderIndex: String(nextOrderIndex),
      type: "Recorded",
      videoUrl: "",
      resourceUrl: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof lectureSchema>) => {
    setServerError(null);
    try {
      await createLecture(moduleId, {
        title: values.title,
        orderIndex: Number(values.orderIndex),
        type: values.type,
        videoUrl: values.videoUrl,
        resourceUrl: values.resourceUrl,
        durationInMinutes: values.durationInMinutes
          ? Number(values.durationInMinutes)
          : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["lectures", moduleId] });
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Add lecture
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lecture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Title"
            htmlFor="lecture-title"
            error={errors.title?.message}
          >
            <Input id="lecture-title" {...register("title")} />
          </FormField>
          <FormField
            label="Type"
            htmlFor="lecture-type"
            error={errors.type?.message}
          >
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="lecture-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recorded">Recorded</SelectItem>
                    <SelectItem value="Live">Live</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Video URL"
            htmlFor="lecture-video"
            error={errors.videoUrl?.message}
          >
            <Input id="lecture-video" {...register("videoUrl")} />
          </FormField>
          <FormField
            label="Resource URL"
            htmlFor="lecture-resource"
            error={errors.resourceUrl?.message}
          >
            <Input id="lecture-resource" {...register("resourceUrl")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Order"
              htmlFor="lecture-order"
              error={errors.orderIndex?.message}
            >
              <Input
                id="lecture-order"
                type="number"
                min={0}
                {...register("orderIndex")}
              />
            </FormField>
            <FormField
              label="Duration (min)"
              htmlFor="lecture-duration"
              error={errors.durationInMinutes?.message}
            >
              <Input
                id="lecture-duration"
                type="number"
                min={0}
                {...register("durationInMinutes")}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adding…" : "Add lecture"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Modules tab --------------------------------------------------------------

// -- Recording --------------------------------------------------------------

function RecordingControls({
  lecture,
  canManage,
}: {
  lecture: Lecture;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setProgress(0);
    try {
      const { data } = await getRecordingUploadSignature(lecture.id);
      await uploadRecordingToCloudinary(data.upload, file, setProgress);
      // Cloudinary calls our webhook once processing finishes; the lecture
      // flips to "ready" then, so refresh now and let the user re-open later.
      await queryClient.invalidateQueries({
        queryKey: ["lectures", lecture.moduleId],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {lecture.recordingStatus === "ready" && (
        <Dialog>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            Watch recording
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{lecture.title}</DialogTitle>
              <DialogDescription>Class recording</DialogDescription>
            </DialogHeader>
            <video
              src={lecture.recordingUrl}
              controls
              preload="metadata"
              className="w-full rounded-lg bg-black"
            />
          </DialogContent>
        </Dialog>
      )}
      {canManage && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={progress !== null}
            onClick={() => fileInput.current?.click()}
          >
            {progress !== null
              ? `Uploading ${progress}%`
              : lecture.recordingStatus === "ready"
                ? "Replace recording"
                : lecture.recordingStatus === "pending"
                  ? "Processing… (re-upload)"
                  : "Upload recording"}
          </Button>
        </>
      )}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}

function ModuleCard({
  moduleId,
  title,
  orderIndex,
  canManage,
}: {
  moduleId: string;
  title: string;
  orderIndex: number;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["lectures", moduleId],
    queryFn: () => listLectures(moduleId),
  });
  const lectures = data?.data.lectures ?? [];

  const removeModule = useMutation({
    mutationFn: () => deleteModule(moduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modules"] }),
  });
  const removeLecture = useMutation({
    mutationFn: deleteLecture,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["lectures", moduleId] }),
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">
          {orderIndex}. {title}
        </CardTitle>
        {canManage && (
          <div className="flex gap-2">
            <AddLectureDialog
              moduleId={moduleId}
              nextOrderIndex={lectures.length}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={removeModule.isPending}
              onClick={() => removeModule.mutate()}
            >
              Delete
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : lectures.length === 0 ? (
          <p className="text-muted-foreground text-sm">No lectures yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lectures.map((lecture) => (
              <li
                key={lecture.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{lecture.type}</Badge>
                  <span>{lecture.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RecordingControls lecture={lecture} canManage={canManage} />
                  <Link
                    href={`/lectures/${lecture.id}/assignments`}
                    className="text-muted-foreground text-sm underline underline-offset-4"
                  >
                    Assignments
                  </Link>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={
                        removeLecture.isPending &&
                        removeLecture.variables === lecture.id
                      }
                      onClick={() => removeLecture.mutate(lecture.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ModulesTab({
  cohortId,
  canManage,
}: {
  cohortId: string;
  canManage: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["modules", cohortId],
    queryFn: () => listModules(cohortId),
  });
  const modules = data?.data.modules ?? [];

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <AddModuleDialog
            cohortId={cohortId}
            nextOrderIndex={modules.length}
          />
        </div>
      )}
      {modules.length === 0 ? (
        <p className="text-muted-foreground text-sm">No modules yet.</p>
      ) : (
        modules.map((module) => (
          <ModuleCard
            key={module.id}
            moduleId={module.id}
            title={module.title}
            orderIndex={module.orderIndex}
            canManage={canManage}
          />
        ))
      )}
    </div>
  );
}

// -- Roster tab ---------------------------------------------------------------

function EnrollStudentsDialog({
  cohortId,
  enrolledIds,
}: {
  cohortId: string;
  enrolledIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["users", "Student"],
    queryFn: () => listUsers({ role: "Student" }),
    enabled: open,
  });
  const students = (data?.data.users ?? []).filter(
    (s) => !enrolledIds.has(s.id),
  );

  const enroll = useMutation({
    mutationFn: () => bulkEnroll(cohortId, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", cohortId] });
      setSelected(new Set());
      setOpen(false);
    },
    onError: (err) => {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        Enroll students
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll students</DialogTitle>
          <DialogDescription>
            Pick students to add to this cohort.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {students.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No unenrolled students found.
              </p>
            ) : (
              students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selected.has(student.id)}
                    onCheckedChange={() => toggle(student.id)}
                  />
                  {student.name} ({student.email})
                </label>
              ))
            )}
          </div>
          <Button
            disabled={selected.size === 0 || enroll.isPending}
            onClick={() => enroll.mutate()}
            className="w-full"
          >
            {enroll.isPending
              ? "Enrolling…"
              : `Enroll ${selected.size || ""}`.trim()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RosterTab({
  cohortId,
  canManage,
}: {
  cohortId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["enrollments", cohortId],
    queryFn: () => listEnrollments(cohortId),
  });
  const enrollments = data?.data.enrollments ?? [];
  const enrolledIds = new Set(
    enrollments.map((e) => e.student?.id).filter((id): id is string => !!id),
  );

  const unenroll = useMutation({
    mutationFn: removeEnrollment,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["enrollments", cohortId] }),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <EnrollStudentsDialog cohortId={cohortId} enrolledIds={enrolledIds} />
        </div>
      )}
      {enrollments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No students enrolled yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell className="font-medium">
                  {enrollment.student?.name}
                </TableCell>
                <TableCell>{enrollment.student?.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      enrollment.status === "Active" ? "default" : "secondary"
                    }
                  >
                    {enrollment.status}
                  </Badge>
                </TableCell>
                <TableCell>{enrollment.progressPercentage}%</TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        unenroll.isPending &&
                        unenroll.variables === enrollment.id
                      }
                      onClick={() => unenroll.mutate(enrollment.id)}
                    >
                      Unenroll
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// -- Page ---------------------------------------------------------------------

export default function CohortDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cohort", params.id],
    queryFn: () => getCohort(params.id),
  });

  const removeCohort = useMutation({
    mutationFn: () => deleteCohort(params.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      router.push("/cohorts");
    },
    onError: (err) => {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const cohort = data?.data.cohort;
  if (!cohort || !user) {
    return <p className="text-muted-foreground text-sm">Cohort not found.</p>;
  }

  const canManage = canManageCohort(cohort, user.id, user.role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{cohort.title}</h1>
          {cohort.description && (
            <p className="text-muted-foreground mt-1">{cohort.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={cohort.status === "Active" ? "default" : "secondary"}
            >
              {cohort.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {new Date(cohort.startDate).toLocaleDateString()}
              {cohort.endDate &&
                ` – ${new Date(cohort.endDate).toLocaleDateString()}`}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <EditCohortDialog cohort={cohort} />
            <Button
              variant="ghost"
              disabled={removeCohort.isPending}
              onClick={() => removeCohort.mutate()}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {deleteError && (
        <Alert variant="destructive">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Link
          href={`/cohorts/${cohort.id}/chat`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Chat
        </Link>
        <Link
          href={`/cohorts/${cohort.id}/questions`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Questions
        </Link>
      </div>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          {canManage && <TabsTrigger value="roster">Roster</TabsTrigger>}
        </TabsList>
        <TabsContent value="modules">
          <ModulesTab cohortId={cohort.id} canManage={canManage} />
        </TabsContent>
        {canManage && (
          <TabsContent value="roster">
            <RosterTab cohortId={cohort.id} canManage={canManage} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
