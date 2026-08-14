import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Organization from '../models/organization.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { generateUniqueSlug } from '../utils/slug.js';
import { sendVerificationEmail } from '../utils/email.js';

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

  await sendVerificationEmail(admin.email, verificationCode);

  return {
    statusCode: 201,
    payload: {
      status: 'success',
      message: 'Institute created. Verification code sent to the admin email. Please verify before logging in.',
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
