"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, login } from "@/lib/api";
import { useOrgLookup } from "@/lib/use-org-lookup";

const schema = z.object({
  slug: z.string().optional(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOrgId = searchParams.get("orgId");
  const queryClient = useQueryClient();
  const { resolveOrgId, isResolving } = useOrgLookup();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    let organizationId = presetOrgId;
    if (!organizationId) {
      if (!values.slug) {
        setError("slug", { message: "Enter your institute's identifier." });
        return;
      }
      try {
        organizationId = await resolveOrgId(values.slug);
      } catch (err) {
        setError("slug", {
          message:
            err instanceof ApiError ? err.message : "Something went wrong.",
        });
        return;
      }
    }

    try {
      await login({
        email: values.email,
        password: values.password,
        organizationId,
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/");
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
      title="Log in"
      description="Sign in to your institute's EdSync workspace."
      footer={
        <>
          No institute yet?{" "}
          <Link
            href="/signup"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Create one
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

        {!presetOrgId && (
          <FormField
            label="Institute identifier"
            htmlFor="slug"
            error={errors.slug?.message}
          >
            <Input
              id="slug"
              placeholder="springfield-institute"
              {...register("slug")}
            />
          </FormField>
        )}

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
            autoComplete="current-password"
            {...register("password")}
          />
        </FormField>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isResolving}
          className="w-full"
        >
          {isSubmitting || isResolving ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex flex-1" />}>
      <LoginForm />
    </Suspense>
  );
}
