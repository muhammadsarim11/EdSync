import { catchAsync } from '../utils/catchAsync.js';
import {
  createModule,
  listModules,
  getModule,
  updateModule,
  deleteModule
} from '../services/module.service.js';

export const create = catchAsync(async (req, res) => {
  const result = await createModule({
    cohortId: req.params.cohortId,
    organizationId: req.user.organizationId,
    user: req.user,
    title: req.body.title,
    orderIndex: req.body.orderIndex
  });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listModules({
    cohortId: req.params.cohortId,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const getOne = catchAsync(async (req, res) => {
  const result = await getModule({
    moduleId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const update = catchAsync(async (req, res) => {
  const result = await updateModule({
    moduleId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user,
    updates: req.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const remove = catchAsync(async (req, res) => {
  const result = await deleteModule({
    moduleId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});
