"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { RequireRole } from "@/components/require-role";
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
import {
  ApiError,
  createInvitation,
  listInvitations,
  revokeInvitation,
} from "@/lib/api";

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["InstituteAdmin", "Instructor", "Student"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "Student" },
  });

  const onSubmit = async (values: InviteFormValues) => {
    setServerError(null);
    try {
      await createInvitation(values);
      await queryClient.invalidateQueries({ queryKey: ["invitations"] });
      reset({ email: "", role: "Student" });
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
      <DialogTrigger render={<Button />}>Invite someone</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new member</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a link to accept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <FormField
            label="Email"
            htmlFor="invite-email"
            error={errors.email?.message}
          >
            <Input id="invite-email" type="email" {...register("email")} />
          </FormField>

          <FormField
            label="Role"
            htmlFor="invite-role"
            error={errors.role?.message}
          >
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="InstituteAdmin">
                      InstituteAdmin
                    </SelectItem>
                    <SelectItem value="Instructor">Instructor</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvitationsTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: listInvitations,
  });

  const revoke = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });

  const invitations = data?.data.invitations ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
        <CardDescription>
          Everyone invited to your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : invitations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No invitations sent yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>{inv.role}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inv.status === "Pending" ? "default" : "secondary"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {inv.status === "Pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          revoke.isPending && revoke.variables === inv._id
                        }
                        onClick={() => revoke.mutate(inv._id)}
                      >
                        Revoke
                      </Button>
                    )}
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

export default function InvitationsPage() {
  return (
    <RequireRole role="InstituteAdmin">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invitations</h1>
          <InviteDialog />
        </div>
        <InvitationsTable />
      </div>
    </RequireRole>
  );
}
