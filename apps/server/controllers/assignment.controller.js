import { catchAsync } from '../utils/catchAsync.js';
import {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment
} from '../services/assignment.service.js';

export const create = catchAsync(async (req, res) => {
  const result = await createAssignment({
    lectureId: req.params.lectureId,
    organizationId: req.user.organizationId,
    user: req.user,
    ...req.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listAssignments({
    lectureId: req.params.lectureId,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const getOne = catchAsync(async (req, res) => {
  const result = await getAssignment({
    assignmentId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const update = catchAsync(async (req, res) => {
  const result = await updateAssignment({
    assignmentId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user,
    updates: req.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const remove = catchAsync(async (req, res) => {
  const result = await deleteAssignment({
    assignmentId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});
