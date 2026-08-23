import { catchAsync } from '../utils/catchAsync.js';
import {
  submitAssignment,
  listSubmissions,
  getSubmission,
  gradeSubmission
} from '../services/submission.service.js';

export const submit = catchAsync(async (req, res) => {
  const result = await submitAssignment({
    assignmentId: req.params.assignmentId,
    organizationId: req.user.organizationId,
    user: req.user,
    fileUrl: req.body.fileUrl
  });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listSubmissions({
    assignmentId: req.params.assignmentId,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const getOne = catchAsync(async (req, res) => {
  const result = await getSubmission({
    submissionId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const grade = catchAsync(async (req, res) => {
  const result = await gradeSubmission({
    submissionId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user,
    obtainedMarks: req.body.obtainedMarks,
    feedback: req.body.feedback
  });
  res.status(result.statusCode).json(result.payload);
});
