import { catchAsync } from '../utils/catchAsync.js';
import {
  createQuestion,
  listQuestions,
  getQuestion,
  addReply,
  resolveQuestion
} from '../services/question.service.js';

export const create = catchAsync(async (req, res) => {
  const result = await createQuestion({
    cohortId: req.params.cohortId,
    organizationId: req.user.organizationId,
    user: req.user,
    title: req.body.title,
    body: req.body.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listQuestions({
    cohortId: req.params.cohortId,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const getOne = catchAsync(async (req, res) => {
  const result = await getQuestion({
    questionId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const reply = catchAsync(async (req, res) => {
  const result = await addReply({
    questionId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user,
    body: req.body.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const resolve = catchAsync(async (req, res) => {
  const result = await resolveQuestion({
    questionId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});
