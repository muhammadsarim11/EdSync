import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import userManagementRoutes from './routes/userManagement.routes.js';
import cohortRoutes from './routes/cohort.routes.js';
import moduleRoutes from './routes/module.routes.js';
import lectureRoutes from './routes/lecture.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { generalLimiter, sanitizeInput } from './middlewares/security.middleware.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use('/api', generalLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/users', userManagementRoutes);
app.use('/api/v1/cohorts', cohortRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/lectures', lectureRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
