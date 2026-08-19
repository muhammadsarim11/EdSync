import Cohort from '../models/cohort.model.js';
import Module from '../models/module.model.js';
import Enrollment from '../models/enrollment.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';

const shapeCohort = (cohort) => ({
  id: cohort._id,
  organizationId: cohort.organizationId,
  instructorId: cohort.instructorId,
  title: cohort.title,
  description: cohort.description,
  status: cohort.status,
  startDate: cohort.startDate,
  endDate: cohort.endDate,
  createdAt: cohort.createdAt
});

// Cohorts are the tenancy root for the curriculum tree: Module/Lecture/
// Enrollment authorization all reduce to "can this user manage/view this
// cohort", so those services fetch a Cohort and call these instead of
// re-deriving instructor/enrollment rules themselves.

export const findCohortOrFail = async ({ cohortId, organizationId }) => {
  const cohort = await Cohort.findOne({ _id: cohortId, organizationId });
  if (!cohort) {
    throw new AppError('Cohort not found.', 404);
  }
  return cohort;
};

// Write access: InstituteAdmin, or the Instructor this cohort is assigned
// to. A non-owning Instructor gets the same 404 as a nonexistent cohort,
// rather than 403, so the endpoint doesn't confirm other instructors' IDs.
export const assertCanManageCohort = (cohort, user) => {
  if (user.role === 'Instructor' && String(cohort.instructorId) !== String(user.id)) {
    throw new AppError('Cohort not found.', 404);
  }
};

// Read access additionally allows an enrolled Student.
export const assertCanViewCohort = async (cohort, user) => {
  if (user.role === 'InstituteAdmin') return;
  if (user.role === 'Instructor') {
    assertCanManageCohort(cohort, user);
    return;
  }
  const enrollment = await Enrollment.findOne({ cohortId: cohort._id, studentId: user.id });
  if (!enrollment) {
    throw new AppError('Cohort not found.', 404);
  }
};

const visibilityFilter = async (organizationId, user) => {
  if (user.role === 'InstituteAdmin') {
    return { organizationId };
  }
  if (user.role === 'Instructor') {
    return { organizationId, instructorId: user.id };
  }
  const enrollments = await Enrollment.find({ organizationId, studentId: user.id }).select('cohortId');
  return { organizationId, _id: { $in: enrollments.map((e) => e.cohortId) } };
};

export const createCohort = async ({
  organizationId,
  title,
  description,
  instructorId,
  startDate,
  endDate
}) => {
  const instructor = await User.findOne({ _id: instructorId, organizationId, role: 'Instructor' });
  if (!instructor) {
    throw new AppError('instructorId must reference an Instructor in this organization.', 400);
  }

  const cohort = await Cohort.create({
    organizationId,
    title,
    description,
    instructorId,
    startDate,
    endDate
  });

  return { statusCode: 201, payload: { status: 'success', data: { cohort: shapeCohort(cohort) } } };
};

export const listCohorts = async ({ organizationId, user }) => {
  const filter = await visibilityFilter(organizationId, user);
  const cohorts = await Cohort.find(filter).sort({ createdAt: -1 });

  return {
    statusCode: 200,
    payload: { status: 'success', results: cohorts.length, data: { cohorts: cohorts.map(shapeCohort) } }
  };
};

export const getCohort = async ({ cohortId, organizationId, user }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  return { statusCode: 200, payload: { status: 'success', data: { cohort: shapeCohort(cohort) } } };
};

export const updateCohort = async ({ cohortId, organizationId, user, updates }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const allowedFields = ['title', 'description', 'status', 'startDate', 'endDate'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) cohort[field] = updates[field];
  }
  await cohort.save();

  return { statusCode: 200, payload: { status: 'success', data: { cohort: shapeCohort(cohort) } } };
};

export const deleteCohort = async ({ cohortId, organizationId, user }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const [enrollmentCount, moduleCount] = await Promise.all([
    Enrollment.countDocuments({ cohortId: cohort._id }),
    Module.countDocuments({ cohortId: cohort._id })
  ]);

  if (enrollmentCount > 0) {
    throw new AppError('Cannot delete a cohort with active enrollments.', 409);
  }
  if (moduleCount > 0) {
    throw new AppError('Cannot delete a cohort with existing modules. Remove them first.', 409);
  }

  await cohort.deleteOne();

  return { statusCode: 200, payload: { status: 'success', message: 'Cohort deleted.' } };
};
