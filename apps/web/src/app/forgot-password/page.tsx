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
import { ApiError, forgotPassword } from "@/lib/api";
import { useOrgLookup } from "@/lib/use-org-lookup";

const schema = z.object({
  slug: z.string().trim().min(1, "Enter your institute's identifier."),
  email: z.string().trim().email("Enter a valid email address."),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
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
    let organizationId: string;
    try {
      organizationId = await resolveOrgId(values.slug);
    } catch (err) {
      setError("slug", {
        message:
          err instanceof ApiError ? err.message : "Something went wrong.",
      });
      return;
    }

    try {
      await forgotPassword({ email: values.email, organizationId });
      router.push(
        `/reset-password?orgId=${organizationId}&email=${encodeURIComponent(values.email)}`,
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
      title="Forgot password"
      description="We'll send a 6-digit reset code to your email if an account exists."
      footer={
        <Link href="/login" className="underline underline-offset-4">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

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

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        </FormField>

        <Button
          type="submit"
          disabled={isSubmitting || isResolving}
          className="w-full"
        >
          {isSubmitting || isResolving ? "Sending…" : "Send reset code"}
        </Button>
      </form>
    </AuthCard>
  );
}
