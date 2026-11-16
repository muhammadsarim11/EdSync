"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboard, listCohorts } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });
  const stats = data?.data.dashboard;

  const tiles = [
    { label: "Total cohorts", value: stats?.cohorts.total },
    { label: "Active cohorts", value: stats?.cohorts.active },
    { label: "Enrolled students", value: stats?.enrolledStudents },
    { label: "Pending invites", value: stats?.pendingInvites },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardHeader>
            <CardDescription>{tile.label}</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-8 w-12" /> : tile.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function CohortList() {
  const { data, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: listCohorts,
  });
  const cohorts = data?.data.cohorts ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>My cohorts</CardTitle>
        <CardDescription>Cohorts you&apos;re part of.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : cohorts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No cohorts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((cohort) => (
                <TableRow key={cohort.id}>
                  <TableCell className="font-medium">{cohort.title}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {user?.role === "InstituteAdmin" ? <AdminDashboard /> : <CohortList />}
    </div>
  );
}
