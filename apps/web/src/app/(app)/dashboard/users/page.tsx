"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RequireRole } from "@/components/require-role";
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
import { listUsers, reactivateUser, suspendUser, type Role } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function UsersTable() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role | "all">("all");
  const [status, setStatus] = useState<"active" | "suspended" | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["users", role, status],
    queryFn: () =>
      listUsers({
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
      }),
  });

  const suspend = useMutation({
    mutationFn: suspendUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
  const reactivate = useMutation({
    mutationFn: reactivateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const users = data?.data.users ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Everyone in your organization.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Select
            value={role}
            onValueChange={(value) => setRole(value as Role | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="InstituteAdmin">InstituteAdmin</SelectItem>
              <SelectItem value="Instructor">Instructor</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as "active" | "suspended" | "all")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No users match these filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const pending =
                  (suspend.isPending && suspend.variables === u.id) ||
                  (reactivate.isPending && reactivate.variables === u.id);

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"}>
                        {u.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            u.isActive
                              ? suspend.mutate(u.id)
                              : reactivate.mutate(u.id)
                          }
                        >
                          {u.isActive ? "Suspend" : "Reactivate"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  return (
    <RequireRole role="InstituteAdmin">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <UsersTable />
      </div>
    </RequireRole>
  );
}
