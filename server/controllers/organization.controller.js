import { catchAsync } from '../utils/catchAsync.js';
import { registerOrganization } from '../services/organization.service.js';

export const createOrganization = catchAsync(async (req, res) => {
  const result = await registerOrganization({
    orgName: req.body.orgName,
    adminName: req.body.adminName,
    email: req.body.email,
    password: req.body.password
  });
  res.status(result.statusCode).json(result.payload);
});
