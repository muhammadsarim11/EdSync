import Module from '../models/module.model.js';
import Lecture from '../models/lecture.model.js';
import AppError from '../utils/AppError.js';
import { findCohortOrFail, assertCanManageCohort, assertCanViewCohort } from './cohort.service.js';

const shapeLecture = (lecture) => ({
  id: lecture._id,
  organizationId: lecture.organizationId,
  cohortId: lecture.cohortId,
  moduleId: lecture.moduleId,
  title: lecture.title,
  orderIndex: lecture.orderIndex,
  type: lecture.type,
  videoUrl: lecture.videoUrl,
  resourceUrl: lecture.resourceUrl,
  durationInMinutes: lecture.durationInMinutes,
  createdAt: lecture.createdAt
});

const findModuleOrFail = async ({ moduleId, organizationId }) => {
  const module = await Module.findOne({ _id: moduleId, organizationId });
  if (!module) {
    throw new AppError('Module not found.', 404);
  }
  return module;
};

const findLectureOrFail = async ({ lectureId, organizationId }) => {
  const lecture = await Lecture.findOne({ _id: lectureId, organizationId });
  if (!lecture) {
    throw new AppError('Lecture not found.', 404);
  }
  return lecture;
};

export const createLecture = async ({
  moduleId,
  organizationId,
  user,
  title,
  orderIndex,
  type,
  videoUrl,
  resourceUrl,
  durationInMinutes
}) => {
  const module = await findModuleOrFail({ moduleId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: module.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const lecture = await Lecture.create({
    organizationId,
    cohortId: module.cohortId,
    moduleId: module._id,
    title,
    orderIndex,
    type,
    videoUrl,
    resourceUrl,
    durationInMinutes
  });

  return { statusCode: 201, payload: { status: 'success', data: { lecture: shapeLecture(lecture) } } };
};

export const listLectures = async ({ moduleId, organizationId, user }) => {
  const module = await findModuleOrFail({ moduleId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: module.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  const lectures = await Lecture.find({ moduleId: module._id }).sort({ orderIndex: 1 });

  return {
    statusCode: 200,
    payload: { status: 'success', results: lectures.length, data: { lectures: lectures.map(shapeLecture) } }
  };
};

export const getLecture = async ({ lectureId, organizationId, user }) => {
  const lecture = await findLectureOrFail({ lectureId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: lecture.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  return { statusCode: 200, payload: { status: 'success', data: { lecture: shapeLecture(lecture) } } };
};

export const updateLecture = async ({ lectureId, organizationId, user, updates }) => {
  const lecture = await findLectureOrFail({ lectureId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: lecture.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const allowedFields = ['title', 'orderIndex', 'type', 'videoUrl', 'resourceUrl', 'durationInMinutes'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) lecture[field] = updates[field];
  }
  await lecture.save();

  return { statusCode: 200, payload: { status: 'success', data: { lecture: shapeLecture(lecture) } } };
};

export const deleteLecture = async ({ lectureId, organizationId, user }) => {
  const lecture = await findLectureOrFail({ lectureId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: lecture.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  await lecture.deleteOne();

  return { statusCode: 200, payload: { status: 'success', message: 'Lecture deleted.' } };
};
