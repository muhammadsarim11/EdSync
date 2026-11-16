import { catchAsync } from '../utils/catchAsync.js';
import {
  createLecture,
  listLectures,
  getLecture,
  updateLecture,
  deleteLecture,
  createRecordingUploadSignature
} from '../services/lecture.service.js';

export const create = catchAsync(async (req, res) => {
  const result = await createLecture({
    moduleId: req.params.moduleId,
    organizationId: req.user.organizationId,
    user: req.user,
    ...req.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const list = catchAsync(async (req, res) => {
  const result = await listLectures({
    moduleId: req.params.moduleId,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const getOne = catchAsync(async (req, res) => {
  const result = await getLecture({
    lectureId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const update = catchAsync(async (req, res) => {
  const result = await updateLecture({
    lectureId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user,
    updates: req.body
  });
  res.status(result.statusCode).json(result.payload);
});

export const remove = catchAsync(async (req, res) => {
  const result = await deleteLecture({
    lectureId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});

export const recordingSignature = catchAsync(async (req, res) => {
  const result = await createRecordingUploadSignature({
    lectureId: req.params.id,
    organizationId: req.user.organizationId,
    user: req.user
  });
  res.status(result.statusCode).json(result.payload);
});
