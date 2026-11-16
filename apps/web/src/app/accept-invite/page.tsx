"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, registerFromInvite } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!inviteToken) return;
    setServerError(null);
    try {
      await registerFromInvite({ ...values, inviteToken });
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

  if (!inviteToken) {
    return (
      <AuthCard
        title="Invalid invite link"
        description="This link is missing its invite token."
      >
        <Alert variant="destructive">
          <AlertDescription>
            Ask whoever invited you to resend the invitation email, then open
            the link from there.
          </AlertDescription>
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Accept your invite"
      description="Enter the email your invite was sent to, and choose a password."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          label="Your name"
          htmlFor="name"
          error={errors.name?.message}
        >
          <Input id="name" autoComplete="name" {...register("name")} />
        </FormField>

        {/* The invite link doesn't expose who it was sent to, so this must match
            the invited address exactly - the API rejects a mismatch. */}
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
          {isSubmitting ? "Creating account…" : "Accept and create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="flex flex-1" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
