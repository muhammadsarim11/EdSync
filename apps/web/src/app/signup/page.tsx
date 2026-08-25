"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, createOrganization } from "@/lib/api";

const schema = z.object({
  orgName: z.string().trim().min(1, "Institute name is required."),
  adminName: z.string().trim().min(1, "Your name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await createOrganization(values);
      const orgId = res.data.organization.id;
      router.push(
        `/verify-email?orgId=${orgId}&email=${encodeURIComponent(values.email)}`,
      );
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <AuthCard
      title="Create your institute"
      description="This sets up your organization and its first admin account."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          label="Institute name"
          htmlFor="orgName"
          error={errors.orgName?.message}
        >
          <Input
            id="orgName"
            placeholder="Springfield Institute"
            {...register("orgName")}
          />
        </FormField>

        <FormField
          label="Your name"
          htmlFor="adminName"
          error={errors.adminName?.message}
        >
          <Input
            id="adminName"
            autoComplete="name"
            {...register("adminName")}
          />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
        </FormField>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating…" : "Create institute"}
        </Button>
      </form>
    </AuthCard>
  );
}
