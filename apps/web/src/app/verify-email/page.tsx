"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { ApiError, resendVerificationCode, verifyEmail } from "@/lib/api";
import { useOrgLookup } from "@/lib/use-org-lookup";

const schema = z.object({
  slug: z.string().optional(),
  email: z.string().trim().email("Enter a valid email address."),
  code: z
    .string()
    .trim()
    .length(6, "Enter the 6-digit code.")
    .regex(/^\d+$/, "Code must be numeric."),
});

type FormValues = z.infer<typeof schema>;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOrgId = searchParams.get("orgId");
  const presetEmail = searchParams.get("email");
  const { resolveOrgId, isResolving } = useOrgLookup();
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: presetEmail ?? "" },
  });

  const resolveThisOrgId = async (slug?: string) => {
    if (presetOrgId) return presetOrgId;
    if (!slug) {
      setError("slug", { message: "Enter your institute's identifier." });
      return null;
    }
    try {
      return await resolveOrgId(slug);
    } catch (err) {
      setError("slug", {
        message:
          err instanceof ApiError ? err.message : "Something went wrong.",
      });
      return null;
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const organizationId = await resolveThisOrgId(values.slug);
    if (!organizationId) return;

    try {
      await verifyEmail({
        email: values.email,
        organizationId,
        code: values.code,
      });
      router.push(`/login?orgId=${organizationId}`);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const onResend = async () => {
    setServerError(null);
    setResendMessage(null);
    const values = getValues();
    const organizationId = await resolveThisOrgId(values.slug);
    if (!organizationId || !values.email) return;

    try {
      const res = await resendVerificationCode({
        email: values.email,
        organizationId,
      });
      setResendMessage(res.message);
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
      title="Verify your email"
      description={
        presetEmail
          ? `Enter the 6-digit code sent to ${presetEmail}.`
          : "Enter your institute, email, and the 6-digit code sent to you."
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        {resendMessage && (
          <Alert>
            <AlertDescription>{resendMessage}</AlertDescription>
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

        {!presetEmail && (
          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
          </FormField>
        )}

        <FormField
          label="Verification code"
          htmlFor="code"
          error={errors.code?.message}
        >
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            {...register("code")}
          />
        </FormField>

        <Button
          type="submit"
          disabled={isSubmitting || isResolving}
          className="w-full"
        >
          {isSubmitting || isResolving ? "Verifying…" : "Verify email"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onResend}
          disabled={isSubmitting || isResolving}
        >
          Resend code
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="underline underline-offset-4">
            Back to log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="flex flex-1" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
