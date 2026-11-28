const REQUIRED_ENV_VARS = ['MONGO_URI', 'JWT_SECRET', 'REDIS_URL'];

// Email is configured one of two ways: a generic SMTP relay (Brevo, Resend,
// SendGrid, ...) when SMTP_HOST is set, or the original Gmail app password.
const SMTP_ENV_VARS = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
const GMAIL_ENV_VARS = ['EMAIL_USER', 'EMAIL_APP_PASS'];

export const findMissingEnv = (env = process.env) => {
  const emailVars = env.SMTP_HOST ? SMTP_ENV_VARS : GMAIL_ENV_VARS;
  return [...REQUIRED_ENV_VARS, ...emailVars].filter((key) => !env[key]);
};

const validateEnv = () => {
  const missing = findMissingEnv();

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
};

export default validateEnv;
