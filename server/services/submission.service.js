import Submission from '../models/submission.model.js';
import AppError from '../utils/AppError.js';
import { findCohortOrFail, assertCanManageCohort, assertCanViewCohort } from './cohort.service.js';
import { findAssignmentOrFail } from './assignment.service.js';

const shapeSubmission = (submission) => ({
  id: submission._id,
  organizationId: submission.organizationId,
  assignmentId: submission.assignmentId,
  studentId: submission.studentId,
  fileUrl: submission.fileUrl,
  obtainedMarks: submission.obtainedMarks,
  feedback: submission.feedback,
  status: submission.status,
  createdAt: submission.createdAt
});

export const submitAssignment = async ({ assignmentId, organizationId, user, fileUrl }) => {
  const assignment = await findAssignmentOrFail({ assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });
  // Only an enrolled Student may submit; assertCanViewCohort already encodes
  // "must be enrolled" for the Student branch (Admin/Instructor never submit).
  await assertCanViewCohort(cohort, user);

  const existing = await Submission.findOne({ assignmentId: assignment._id, studentId: user.id });
  if (existing) {
    throw new AppError('You have already submitted this assignment.', 409);
  }

  const status = Date.now() > new Date(assignment.deadline).getTime() ? 'Late' : 'Submitted';

  const submission = await Submission.create({
    organizationId,
    assignmentId: assignment._id,
    studentId: user.id,
    fileUrl,
    status
  });

  return {
    statusCode: 201,
    payload: { status: 'success', data: { submission: shapeSubmission(submission) } }
  };
};

export const listSubmissions = async ({ assignmentId, organizationId, user }) => {
  const assignment = await findAssignmentOrFail({ assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });

  if (user.role === 'Student') {
    await assertCanViewCohort(cohort, user);
    const submission = await Submission.findOne({ assignmentId: assignment._id, studentId: user.id });
    const submissions = submission ? [shapeSubmission(submission)] : [];
    return {
      statusCode: 200,
      payload: { status: 'success', results: submissions.length, data: { submissions } }
    };
  }

  assertCanManageCohort(cohort, user);
  const submissions = await Submission.find({ assignmentId: assignment._id })
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 });

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      results: submissions.length,
      data: {
        submissions: submissions.map((s) => ({
          id: s._id,
          organizationId: s.organizationId,
          assignmentId: s.assignmentId,
          fileUrl: s.fileUrl,
          obtainedMarks: s.obtainedMarks,
          feedback: s.feedback,
          status: s.status,
          createdAt: s.createdAt,
          student: s.studentId && { id: s.studentId._id, name: s.studentId.name, email: s.studentId.email }
        }))
      }
    }
  };
};

export const getSubmission = async ({ submissionId, organizationId, user }) => {
  const submission = await Submission.findOne({ _id: submissionId, organizationId });
  if (!submission) {
    throw new AppError('Submission not found.', 404);
  }

  if (user.role === 'Student') {
    if (String(submission.studentId) !== String(user.id)) {
      throw new AppError('Submission not found.', 404);
    }
    return {
      statusCode: 200,
      payload: { status: 'success', data: { submission: shapeSubmission(submission) } }
    };
  }

  const assignment = await findAssignmentOrFail({ assignmentId: submission.assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  return {
    statusCode: 200,
    payload: { status: 'success', data: { submission: shapeSubmission(submission) } }
  };
};

export const gradeSubmission = async ({ submissionId, organizationId, user, obtainedMarks, feedback }) => {
  const submission = await Submission.findOne({ _id: submissionId, organizationId });
  if (!submission) {
    throw new AppError('Submission not found.', 404);
  }

  const assignment = await findAssignmentOrFail({ assignmentId: submission.assignmentId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: assignment.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  if (obtainedMarks > assignment.totalMarks) {
    throw new AppError(
      `obtainedMarks cannot exceed the assignment's totalMarks (${assignment.totalMarks}).`,
      400
    );
  }

  submission.obtainedMarks = obtainedMarks;
  if (feedback !== undefined) submission.feedback = feedback;
  submission.status = 'Graded';
  await submission.save();

  return {
    statusCode: 200,
    payload: { status: 'success', data: { submission: shapeSubmission(submission) } }
  };
};
