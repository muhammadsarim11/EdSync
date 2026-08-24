import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Organization from '../models/organization.model.js';
import User from '../models/user.model.js';
import Cohort from '../models/cohort.model.js';
import Enrollment from '../models/enrollment.model.js';
import Invitation from '../models/invitation.model.js';
import AppError from '../utils/AppError.js';
import { generateUniqueSlug } from '../utils/slug.js';
import { queueVerificationEmail } from '../queues/email.queue.js';

const shapeOrganization = (organization) => ({
  id: organization._id,
  name: organization.name,
  slug: organization.slug,
  logoUrl: organization.logoUrl,
  themeColor: organization.themeColor,
  createdAt: organization.createdAt
});

export const registerOrganization = async ({ orgName, adminName, email, password }) => {
  if (!orgName || !adminName || !email || !password) {
    throw new AppError('Please provide organization name, admin name, email, and password.', 400);
  }

  const slug = await generateUniqueSlug(orgName, Organization);

  const organization = await Organization.create({ name: orgName, slug });

  const verificationCode = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = await bcrypt.hash(verificationCode, 12);

  const admin = await User.create({
    name: adminName,
    email: email.toLowerCase(),
    password,
    role: 'InstituteAdmin',
    organizationId: organization._id,
    isEmailVerified: false,
    verificationCode: hashedCode,
    verificationCodeExpires: Date.now() + 10 * 60 * 1000
  });

  await queueVerificationEmail(admin.email, verificationCode);

  return {
    statusCode: 201,
    payload: {
      status: 'success',
      message:
        'Institute created. Verification code sent to the admin email. Please verify before logging in.',
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug
        }
      }
    }
  };
};

export const getMyOrganization = async ({ organizationId }) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  return {
    statusCode: 200,
    payload: { status: 'success', data: { organization: shapeOrganization(organization) } }
  };
};

export const updateMyOrganization = async ({ organizationId, name, logoUrl, themeColor }) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  if (name !== undefined) organization.name = name;
  if (logoUrl !== undefined) organization.logoUrl = logoUrl;
  if (themeColor !== undefined) organization.themeColor = themeColor;

  await organization.save();

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'Organization updated.',
      data: { organization: shapeOrganization(organization) }
    }
  };
};

export const getMyOrganizationDashboard = async ({ organizationId }) => {
  const [totalCohorts, activeCohorts, enrolledStudentIds, pendingInvites] = await Promise.all([
    Cohort.countDocuments({ organizationId }),
    Cohort.countDocuments({ organizationId, status: 'Active' }),
    Enrollment.distinct('studentId', { organizationId, status: 'Active' }),
    Invitation.countDocuments({ organizationId, status: 'Pending' })
  ]);

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      data: {
        dashboard: {
          cohorts: { total: totalCohorts, active: activeCohorts },
          enrolledStudents: enrolledStudentIds.length,
          pendingInvites
        }
      }
    }
  };
};
