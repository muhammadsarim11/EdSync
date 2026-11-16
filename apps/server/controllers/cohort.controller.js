import { catchAsync } from '../utils/catchAsync.js';
import {
  createCohort,
  listCohorts,
  getCohort,
  updateCohort,
  deleteCohort
} from '../services/cohort.service.js';

export const create = catchAsync(async (req, res) => {
  const result = await createCohort({ organizationId: req.user.organizationId, ...req.body });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listCohorts({ organizationId: req.user.organizationId, user: req.user });
  res.status(result.statusCode).json(result.payload);
});

export const getOne = catchAsync(async (req, res) => {
  const result = await getCohort({
    cohortId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const update = catchAsync(async (req, res) => {
  const result = await updateCohort({
    cohortId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user,
    updates: req.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const remove = catchAsync(async (req, res) => {
  const result = await deleteCohort({
    cohortId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});
