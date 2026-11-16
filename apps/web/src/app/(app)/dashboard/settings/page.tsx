"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form-field";
import { RequireRole } from "@/components/require-role";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, getOrganization, updateOrganization } from "@/lib/api";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Institute name cannot be empty."),
  logoUrl: z.string().trim().optional(),
  themeColor: z
    .string()
    .trim()
    .regex(
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      "Enter a valid hex color, e.g. #1A2B3C.",
    ),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function SettingsForm() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
  });
  const organization = data?.data.organization;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: organization
      ? {
          name: organization.name,
          logoUrl: organization.logoUrl,
          themeColor: organization.themeColor,
        }
      : undefined,
  });

  const onSubmit = async (values: SettingsFormValues) => {
    setServerError(null);
    setSaved(false);
    try {
      await updateOrganization(values);
      await queryClient.invalidateQueries({ queryKey: ["organization"] });
      setSaved(true);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  if (isLoading || !organization) return null;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Shown across the workspace for everyone in your institute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>Saved.</AlertDescription>
            </Alert>
          )}

          <FormField
            label="Institute name"
            htmlFor="settings-name"
            error={errors.name?.message}
          >
            <Input id="settings-name" {...register("name")} />
          </FormField>

          <FormField
            label="Logo URL"
            htmlFor="settings-logo"
            error={errors.logoUrl?.message}
          >
            <Input
              id="settings-logo"
              placeholder="https://example.com/logo.png"
              {...register("logoUrl")}
            />
          </FormField>

          <FormField
            label="Theme color"
            htmlFor="settings-color"
            error={errors.themeColor?.message}
          >
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="themeColor"
                render={({ field }) => (
                  <input
                    type="color"
                    id="settings-color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(field.value)
                        ? field.value
                        : "#000000"
                    }
                    onChange={(e) => field.onChange(e.target.value)}
                    className="border-input h-8 w-12 cursor-pointer rounded-md border"
                  />
                )}
              />
              <Input {...register("themeColor")} className="max-w-32" />
            </div>
          </FormField>

          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <RequireRole role="InstituteAdmin">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <SettingsForm />
      </div>
    </RequireRole>
  );
}
