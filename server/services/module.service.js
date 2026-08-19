import Module from '../models/module.model.js';
import Lecture from '../models/lecture.model.js';
import AppError from '../utils/AppError.js';
import { findCohortOrFail, assertCanManageCohort, assertCanViewCohort } from './cohort.service.js';

const shapeModule = (module) => ({
  id: module._id,
  organizationId: module.organizationId,
  cohortId: module.cohortId,
  title: module.title,
  orderIndex: module.orderIndex,
  createdAt: module.createdAt
});

const findModuleOrFail = async ({ moduleId, organizationId }) => {
  const module = await Module.findOne({ _id: moduleId, organizationId });
  if (!module) {
    throw new AppError('Module not found.', 404);
  }
  return module;
};

export const createModule = async ({ cohortId, organizationId, user, title, orderIndex }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const module = await Module.create({ organizationId, cohortId, title, orderIndex });

  return { statusCode: 201, payload: { status: 'success', data: { module: shapeModule(module) } } };
};

export const listModules = async ({ cohortId, organizationId, user }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  const modules = await Module.find({ cohortId: cohort._id }).sort({ orderIndex: 1 });

  return {
    statusCode: 200,
    payload: { status: 'success', results: modules.length, data: { modules: modules.map(shapeModule) } }
  };
};

export const getModule = async ({ moduleId, organizationId, user }) => {
  const module = await findModuleOrFail({ moduleId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: module.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  return { statusCode: 200, payload: { status: 'success', data: { module: shapeModule(module) } } };
};

export const updateModule = async ({ moduleId, organizationId, user, updates }) => {
  const module = await findModuleOrFail({ moduleId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: module.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  if (updates.title !== undefined) module.title = updates.title;
  if (updates.orderIndex !== undefined) module.orderIndex = updates.orderIndex;
  await module.save();

  return { statusCode: 200, payload: { status: 'success', data: { module: shapeModule(module) } } };
};

export const deleteModule = async ({ moduleId, organizationId, user }) => {
  const module = await findModuleOrFail({ moduleId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: module.cohortId, organizationId });
  assertCanManageCohort(cohort, user);

  const lectureCount = await Lecture.countDocuments({ moduleId: module._id });
  if (lectureCount > 0) {
    throw new AppError('Cannot delete a module with existing lectures. Remove them first.', 409);
  }

  await module.deleteOne();

  return { statusCode: 200, payload: { status: 'success', message: 'Module deleted.' } };
};
