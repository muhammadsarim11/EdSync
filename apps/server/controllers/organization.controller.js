import { catchAsync } from '../utils/catchAsync.js';
import {
  registerOrganization,
  lookupOrganizationBySlug,
  getMyOrganization,
  updateMyOrganization,
  getMyOrganizationDashboard
} from '../services/organization.service.js';

export const createOrganization = catchAsync(async (req, res) => {
  const result = await registerOrganization({
    orgName: req.body.orgName,
    adminName: req.body.adminName,
    email: req.body.email,
    password: req.body.password
  });
  res.status(result.statusCode).json(result.payload);
});

export const lookupOrganization = catchAsync(async (req, res) => {
  const result = await lookupOrganizationBySlug({ slug: req.query.slug });
  res.status(result.statusCode).json(result.payload);
});

export const getOrganization = catchAsync(async (req, res) => {
  const result = await getMyOrganization({ organizationId: req.user.organizationId });
  res.status(result.statusCode).json(result.payload);
});

export const updateOrganization = catchAsync(async (req, res) => {
  const result = await updateMyOrganization({
    organizationId: req.user.organizationId,
    name: req.body.name,
    logoUrl: req.body.logoUrl,
    themeColor: req.body.themeColor
  });
  res.status(result.statusCode).json(result.payload);
});

export const getOrganizationDashboard = catchAsync(async (req, res) => {
  const result = await getMyOrganizationDashboard({ organizationId: req.user.organizationId });
  res.status(result.statusCode).json(result.payload);
});
