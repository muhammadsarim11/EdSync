const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.message ?? "Something went wrong. Please try again.",
    );
  }

  return body as T;
}

export type Role = "InstituteAdmin" | "Instructor" | "Student";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  organizationId: string;
  createdAt: string;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  logoUrl: string;
};

// -- Session --------------------------------------------------------------

export const getMe = () =>
  request<{ status: "success"; data: { user: User } }>("/auth/me");

export const logout = () =>
  request<{ status: "success" }>("/auth/logout", { method: "POST" });

// -- Organizations ----------------------------------------------------------

export const lookupOrganization = (slug: string) =>
  request<{ status: "success"; data: { organization: OrganizationSummary } }>(
    `/organizations/lookup?slug=${encodeURIComponent(slug)}`,
  );

export const createOrganization = (input: {
  orgName: string;
  adminName: string;
  email: string;
  password: string;
}) =>
  request<{
    status: "success";
    message: string;
    data: { organization: { id: string; name: string; slug: string } };
  }>("/organizations", { method: "POST", body: JSON.stringify(input) });

// -- Auth ---------------------------------------------------------------

export const login = (input: {
  email: string;
  password: string;
  organizationId: string;
}) =>
  request<{ status: "success"; token: string; data: { user: User } }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

export const registerFromInvite = (input: {
  name: string;
  email: string;
  password: string;
  inviteToken: string;
}) =>
  request<{ status: "success"; data: { user: User } }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const verifyEmail = (input: {
  email: string;
  organizationId: string;
  code: string;
}) =>
  request<{ status: "success"; message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const resendVerificationCode = (input: {
  email: string;
  organizationId: string;
}) =>
  request<{ status: "success"; message: string }>(
    "/auth/resend-verification-code",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

export const forgotPassword = (input: {
  email: string;
  organizationId: string;
}) =>
  request<{ status: "success"; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const resetPassword = (input: {
  email: string;
  organizationId: string;
  code: string;
  newPassword: string;
}) =>
  request<{ status: "success"; message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const resendPasswordResetCode = (input: {
  email: string;
  organizationId: string;
}) =>
  request<{ status: "success"; message: string }>(
    "/auth/resend-password-reset-code",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
