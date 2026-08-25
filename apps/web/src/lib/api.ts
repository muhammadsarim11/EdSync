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

export const getMe = () =>
  request<{ status: "success"; data: { user: User } }>("/auth/me");

export const logout = () =>
  request<{ status: "success" }>("/auth/logout", { method: "POST" });
