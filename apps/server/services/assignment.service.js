import Lecture from '../models/lecture.model.js';
import Assignment from '../models/assignment.model.js';
import Submission from '../models/submission.model.js';
import AppError from '../utils/AppError.js';
import { findCohortOrFail, assertCanManageCohort, assertCanViewCohort } from './cohort.service.js';

const shapeAssignment = (assignment) => ({
  id: assignment._id,
  organizationId: assignment.organizationId,
  cohortId: assignment.cohortId,
  lectureId: assignment.lectureId,
  title: assignment.title,
  description: assignment.description,
  attachmentUrl: assignment.attachmentUrl,
  deadline: assignment.deadline,
  totalMarks: assignment.totalMarks,
  createdAt: assignment.createdAt
});

const findLectureOrFail = async ({ lectureId, organizationId }) => {
  const lecture = await Lecture.findOne({ _id: lectureId, organizationId });
  if (!lecture) {
    throw new AppError('Lecture not found.', 404);
  }
  return lecture;
};

export const findAssignmentOrFail = async ({ assignmentId, organizationId }) => {
  const assignment = await Assignment.findOne({ _id: assignmentId, organizationId });
  if (!assignment) {
    throw new AppError('Assignment not found.', 404);
  }
  return assignment;
};

export const createAssignment = async ({
  lectureId,
  organizationId,
  user,
  title,
  description,
  attachmentUrl,
  deadline,
  totalMarks
}) => {
  const lecture = await findLectureOrFail({ lectureId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: lecture.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const assignment = await Assignment.create({
    organizationId,
    cohortId: lecture.cohortId,
    lectureId: lecture._id,
    title,
    description,
    attachmentUrl,
    deadline,
    totalMarks
  });

  return {
    statusCode: 201,
    payload: { status: 'success', data: { assignment: shapeAssignment(assignment) } }
  };
};

export const listAssignments = async ({ lectureId, organizationId, user }) => {
  const lecture = await findLectureOrFail({ lectureId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: lecture.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  const assignments = await Assignment.find({ lectureId: lecture._id }).sort({ deadline: 1 });

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      results: assignments.length,
      data: { assignments: assignments.map(shapeAssignment) }
    }
  };
};

export const getAssignment = async ({ assignmentId, organizationId, user }) => {
  const assignment = await findAssignmentOrFail({ assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  return {
    statusCode: 200,
    payload: { status: 'success', data: { assignment: shapeAssignment(assignment) } }
  };
};

export const updateAssignment = async ({ assignmentId, organizationId, user, updates }) => {
  const assignment = await findAssignmentOrFail({ assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const allowedFields = ['title', 'description', 'attachmentUrl', 'deadline', 'totalMarks'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) assignment[field] = updates[field];
  }
  await assignment.save();

  return {
    statusCode: 200,
    payload: { status: 'success', data: { assignment: shapeAssignment(assignment) } }
  };
};

export const deleteAssignment = async ({ assignmentId, organizationId, user }) => {
  const assignment = await findAssignmentOrFail({ assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const submissionCount = await Submission.countDocuments({ assignmentId: assignment._id });
  if (submissionCount > 0) {
    throw new AppError('Cannot delete an assignment with existing submissions.', 409);
  }

  await assignment.deleteOne();

  return { statusCode: 200, payload: { status: 'success', message: 'Assignment deleted.' } };
};
