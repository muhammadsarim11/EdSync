import Enrollment from '../models/enrollment.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { findCohortOrFail, assertCanManageCohort } from './cohort.service.js';

const shapeEnrollment = (enrollment) => ({
  id: enrollment._id,
  organizationId: enrollment.organizationId,
  cohortId: enrollment.cohortId,
  studentId: enrollment.studentId,
  status: enrollment.status,
  progressPercentage: enrollment.progressPercentage,
  createdAt: enrollment.createdAt
});

export const bulkEnroll = async ({ cohortId, organizationId, user, studentIds }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const uniqueStudentIds = [...new Set(studentIds.map(String))];
  const students = await User.find({
    _id: { $in: uniqueStudentIds },
    organizationId,
    role: 'Student'
  }).select('_id');

  const validIds = new Set(students.map((s) => String(s._id)));
  const invalidIds = uniqueStudentIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    throw new AppError(
      `The following studentIds do not reference a Student in this organization: ${invalidIds.join(', ')}.`,
      400
    );
  }

  const alreadyEnrolled = await Enrollment.find({
    cohortId: cohort._id,
    studentId: { $in: uniqueStudentIds }
  }).select('studentId');
  const alreadyEnrolledIds = new Set(alreadyEnrolled.map((e) => String(e.studentId)));

  const toEnroll = uniqueStudentIds.filter((id) => !alreadyEnrolledIds.has(id));
  const created = toEnroll.length
    ? await Enrollment.insertMany(
        toEnroll.map((studentId) => ({ organizationId, cohortId: cohort._id, studentId }))
      )
    : [];

  return {
    statusCode: 201,
    payload: {
      status: 'success',
      message: `Enrolled ${created.length} student(s); ${alreadyEnrolledIds.size} were already enrolled.`,
      data: { enrollments: created.map(shapeEnrollment) }
    }
  };
};

export const listEnrollments = async ({ cohortId, organizationId, user }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const enrollments = await Enrollment.find({ cohortId: cohort._id })
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 });

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      results: enrollments.length,
      data: {
        enrollments: enrollments.map((e) => ({
          id: e._id,
          organizationId: e.organizationId,
          cohortId: e.cohortId,
          status: e.status,
          progressPercentage: e.progressPercentage,
          createdAt: e.createdAt,
          student: e.studentId && { id: e.studentId._id, name: e.studentId.name, email: e.studentId.email }
        }))
      }
    }
  };
};

export const removeEnrollment = async ({ enrollmentId, organizationId, user }) => {
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, organizationId });
  if (!enrollment) {
    throw new AppError('Enrollment not found.', 404);
  }

  const cohort = await findCohortOrFail({ cohortId: enrollment.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  await enrollment.deleteOne();

  return { statusCode: 200, payload: { status: 'success', message: 'Student unenrolled.' } };
};
