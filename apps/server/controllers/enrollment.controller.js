import { catchAsync } from '../utils/catchAsync.js';
import { bulkEnroll, listEnrollments, removeEnrollment } from '../services/enrollment.service.js';

export const create = catchAsync(async (req, res) => {
  const result = await bulkEnroll({
    cohortId: req.params.cohortId,
    organizationId: req.user.organizationId,
    user: req.user,
    studentIds: req.body.studentIds
  });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listEnrollments({
    cohortId: req.params.cohortId,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const remove = catchAsync(async (req, res) => {
  const result = await removeEnrollment({
    enrollmentId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});
