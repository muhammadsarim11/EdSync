import Question from '../models/question.model.js';
import AppError from '../utils/AppError.js';
import { findCohortOrFail, assertCanManageCohort, assertCanViewCohort } from './cohort.service.js';

const shapeReply = (reply) => ({
  id: reply._id,
  authorId: reply.authorId,
  body: reply.body,
  createdAt: reply.createdAt
});

const shapeQuestion = (question) => ({
  id: question._id,
  organizationId: question.organizationId,
  cohortId: question.cohortId,
  authorId: question.authorId,
  title: question.title,
  body: question.body,
  status: question.status,
  replies: question.replies.map(shapeReply),
  createdAt: question.createdAt
});

const findQuestionOrFail = async ({ questionId, organizationId }) => {
  const question = await Question.findOne({ _id: questionId, organizationId });
  if (!question) {
    throw new AppError('Question not found.', 404);
  }
  return question;
};

export const createQuestion = async ({ cohortId, organizationId, user, title, body }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  const question = await Question.create({
    organizationId,
    cohortId: cohort._id,
    authorId: user.id,
    title,
    body
  });

  return { statusCode: 201, payload: { status: 'success', data: { question: shapeQuestion(question) } } };
};

export const listQuestions = async ({ cohortId, organizationId, user }) => {
  const cohort = await findCohortOrFail({ cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  const questions = await Question.find({ cohortId: cohort._id }).sort({ createdAt: -1 });

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      results: questions.length,
      data: { questions: questions.map(shapeQuestion) }
    }
  };
};

export const getQuestion = async ({ questionId, organizationId, user }) => {
  const question = await findQuestionOrFail({ questionId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: question.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  return { statusCode: 200, payload: { status: 'success', data: { question: shapeQuestion(question) } } };
};

export const addReply = async ({ questionId, organizationId, user, body }) => {
  const question = await findQuestionOrFail({ questionId, organizationId });
  const cohort = await findCohortOrFail({ cohortId: question.cohortId, organizationId });
  await assertCanViewCohort(cohort, user);

  question.replies.push({ authorId: user.id, body });
  await question.save();

  return { statusCode: 201, payload: { status: 'success', data: { question: shapeQuestion(question) } } };
};

export const resolveQuestion = async ({ questionId, organizationId, user }) => {
  const question = await findQuestionOrFail({ questionId, organizationId });

  const isAuthor = String(question.authorId) === String(user.id);
  if (!isAuthor) {
    // assertCanManageCohort only narrows Instructor ownership - it assumes
    // Student was already filtered out by route-level restrictTo, which
    // isn't true here (the author, reaching this via isAuthor above, can be
    // a Student). A non-author Student must still be blocked explicitly.
    if (user.role === 'Student') {
      throw new AppError('Question not found.', 404);
    }
    const cohort = await findCohortOrFail({ cohortId: question.cohortId, organizationId });
    assertCanManageCohort(cohort, user);
  }

  question.status = 'Resolved';
  await question.save();

  return { statusCode: 200, payload: { status: 'success', data: { question: shapeQuestion(question) } } };
};
