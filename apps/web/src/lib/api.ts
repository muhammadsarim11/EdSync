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

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  themeColor: string;
  createdAt: string;
};

export type DashboardStats = {
  cohorts: { total: number; active: number };
  enrolledStudents: number;
  pendingInvites: number;
};

export type Cohort = {
  id: string;
  organizationId: string;
  instructorId: string;
  title: string;
  description?: string;
  status: "Upcoming" | "Active" | "Completed";
  startDate: string;
  endDate?: string;
  createdAt: string;
};

// GET /invitations returns raw Mongoose documents (_id), unlike the shaped
// `id` fields the rest of the API uses - see docs/API.md.
export type Invitation = {
  _id: string;
  email: string;
  role: Role;
  status: "Pending" | "Accepted" | "Revoked";
  expiresAt: string;
  createdAt: string;
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

export const getOrganization = () =>
  request<{ status: "success"; data: { organization: Organization } }>(
    "/organizations/me",
  );

export const getDashboard = () =>
  request<{ status: "success"; data: { dashboard: DashboardStats } }>(
    "/organizations/me/dashboard",
  );

// -- Cohorts ----------------------------------------------------------------

export const listCohorts = () =>
  request<{ status: "success"; results: number; data: { cohorts: Cohort[] } }>(
    "/cohorts",
  );

// -- User management ---------------------------------------------------------

export const listUsers = (
  params: { role?: Role; status?: "active" | "suspended" } = {},
) => {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return request<{
    status: "success";
    results: number;
    data: { users: User[] };
  }>(`/users${qs ? `?${qs}` : ""}`);
};

export const suspendUser = (id: string) =>
  request<{ status: "success"; message: string; data: { user: User } }>(
    `/users/${id}/suspend`,
    {
      method: "PATCH",
    },
  );

export const reactivateUser = (id: string) =>
  request<{ status: "success"; message: string; data: { user: User } }>(
    `/users/${id}/reactivate`,
    {
      method: "PATCH",
    },
  );

// -- Invitations --------------------------------------------------------------

export const listInvitations = () =>
  request<{ status: "success"; data: { invitations: Invitation[] } }>(
    "/invitations",
  );

export const createInvitation = (input: { email: string; role: Role }) =>
  request<{
    status: "success";
    message: string;
    data: {
      invitation: {
        id: string;
        email: string;
        role: Role;
        status: string;
        expiresAt: string;
      };
    };
  }>("/invitations", { method: "POST", body: JSON.stringify(input) });

export const revokeInvitation = (id: string) =>
  request<{ status: "success"; message: string }>(`/invitations/${id}`, {
    method: "DELETE",
  });

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
