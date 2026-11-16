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

export type Module = {
  id: string;
  organizationId: string;
  cohortId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
};

export type Lecture = {
  id: string;
  organizationId: string;
  cohortId: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  type: "Live" | "Recorded";
  videoUrl: string;
  resourceUrl: string;
  durationInMinutes: number;
  createdAt: string;
};

export type Assignment = {
  id: string;
  organizationId: string;
  cohortId: string;
  lectureId: string;
  title: string;
  description?: string;
  attachmentUrl: string;
  deadline: string;
  totalMarks: number;
  createdAt: string;
};

// Shape differs by audience: a Student's own entry has `studentId`; staff's
// list has `student` populated instead - see docs/API.md.
export type Submission = {
  id: string;
  organizationId: string;
  assignmentId: string;
  studentId?: string;
  fileUrl: string;
  obtainedMarks: number | null;
  feedback: string;
  status: "Submitted" | "Graded" | "Late";
  createdAt: string;
  student?: { id: string; name: string; email: string } | null;
};

export type Enrollment = {
  id: string;
  organizationId: string;
  cohortId: string;
  status: "Active" | "Completed" | "Dropped";
  progressPercentage: number;
  createdAt: string;
  student: { id: string; name: string; email: string } | null;
};

export type Reply = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Question = {
  id: string;
  organizationId: string;
  cohortId: string;
  authorId: string;
  title: string;
  body: string;
  status: "Open" | "Resolved";
  replies: Reply[];
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

export const updateOrganization = (
  input: Partial<{ name: string; logoUrl: string; themeColor: string }>,
) =>
  request<{ status: "success"; data: { organization: Organization } }>(
    "/organizations/me",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
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

export const getCohort = (id: string) =>
  request<{ status: "success"; data: { cohort: Cohort } }>(`/cohorts/${id}`);

export const createCohort = (input: {
  title: string;
  description?: string;
  instructorId: string;
  startDate: string;
  endDate?: string;
}) =>
  request<{ status: "success"; data: { cohort: Cohort } }>("/cohorts", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateCohort = (
  id: string,
  input: Partial<{
    title: string;
    description: string;
    status: Cohort["status"];
    startDate: string;
    endDate: string;
  }>,
) =>
  request<{ status: "success"; data: { cohort: Cohort } }>(`/cohorts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteCohort = (id: string) =>
  request<{ status: "success"; message: string }>(`/cohorts/${id}`, {
    method: "DELETE",
  });

// -- Modules ------------------------------------------------------------------

export const listModules = (cohortId: string) =>
  request<{ status: "success"; results: number; data: { modules: Module[] } }>(
    `/cohorts/${cohortId}/modules`,
  );

export const createModule = (
  cohortId: string,
  input: { title: string; orderIndex: number },
) =>
  request<{ status: "success"; data: { module: Module } }>(
    `/cohorts/${cohortId}/modules`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

export const deleteModule = (id: string) =>
  request<{ status: "success"; message: string }>(`/modules/${id}`, {
    method: "DELETE",
  });

// -- Lectures -----------------------------------------------------------------

export const listLectures = (moduleId: string) =>
  request<{
    status: "success";
    results: number;
    data: { lectures: Lecture[] };
  }>(`/modules/${moduleId}/lectures`);

export const createLecture = (
  moduleId: string,
  input: {
    title: string;
    orderIndex: number;
    type: "Live" | "Recorded";
    videoUrl?: string;
    resourceUrl?: string;
    durationInMinutes?: number;
  },
) =>
  request<{ status: "success"; data: { lecture: Lecture } }>(
    `/modules/${moduleId}/lectures`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

export const getLecture = (id: string) =>
  request<{ status: "success"; data: { lecture: Lecture } }>(`/lectures/${id}`);

export const deleteLecture = (id: string) =>
  request<{ status: "success"; message: string }>(`/lectures/${id}`, {
    method: "DELETE",
  });

// -- Assignments --------------------------------------------------------------

export const listAssignments = (lectureId: string) =>
  request<{
    status: "success";
    results: number;
    data: { assignments: Assignment[] };
  }>(`/lectures/${lectureId}/assignments`);

export const getAssignment = (id: string) =>
  request<{ status: "success"; data: { assignment: Assignment } }>(
    `/assignments/${id}`,
  );

export const createAssignment = (
  lectureId: string,
  input: {
    title: string;
    description?: string;
    attachmentUrl?: string;
    deadline: string;
    totalMarks?: number;
  },
) =>
  request<{ status: "success"; data: { assignment: Assignment } }>(
    `/lectures/${lectureId}/assignments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

export const deleteAssignment = (id: string) =>
  request<{ status: "success"; message: string }>(`/assignments/${id}`, {
    method: "DELETE",
  });

// -- Submissions --------------------------------------------------------------

export const listSubmissions = (assignmentId: string) =>
  request<{
    status: "success";
    results: number;
    data: { submissions: Submission[] };
  }>(`/assignments/${assignmentId}/submissions`);

export const submitAssignment = (assignmentId: string, fileUrl: string) =>
  request<{ status: "success"; data: { submission: Submission } }>(
    `/assignments/${assignmentId}/submissions`,
    { method: "POST", body: JSON.stringify({ fileUrl }) },
  );

export const gradeSubmission = (
  id: string,
  input: { obtainedMarks: number; feedback?: string },
) =>
  request<{ status: "success"; data: { submission: Submission } }>(
    `/submissions/${id}/grade`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

// -- Enrollments --------------------------------------------------------------

export const listEnrollments = (cohortId: string) =>
  request<{
    status: "success";
    results: number;
    data: { enrollments: Enrollment[] };
  }>(`/cohorts/${cohortId}/enrollments`);

export const bulkEnroll = (cohortId: string, studentIds: string[]) =>
  request<{
    status: "success";
    message: string;
    data: { enrollments: Enrollment[] };
  }>(`/cohorts/${cohortId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ studentIds }),
  });

export const removeEnrollment = (id: string) =>
  request<{ status: "success"; message: string }>(`/enrollments/${id}`, {
    method: "DELETE",
  });

// -- Questions (Q&A board) -----------------------------------------------------

export const listQuestions = (cohortId: string) =>
  request<{
    status: "success";
    results: number;
    data: { questions: Question[] };
  }>(`/cohorts/${cohortId}/questions`);

export const getQuestion = (id: string) =>
  request<{ status: "success"; data: { question: Question } }>(
    `/questions/${id}`,
  );

export const createQuestion = (
  cohortId: string,
  input: { title: string; body: string },
) =>
  request<{ status: "success"; data: { question: Question } }>(
    `/cohorts/${cohortId}/questions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

export const addReply = (questionId: string, body: string) =>
  request<{ status: "success"; data: { question: Question } }>(
    `/questions/${questionId}/replies`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );

export const resolveQuestion = (id: string) =>
  request<{ status: "success"; data: { question: Question } }>(
    `/questions/${id}/resolve`,
    {
      method: "PATCH",
    },
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
