import nodemailer from 'nodemailer';

const sendEmailMessage = async (email, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'sarimkhan13579@gmail.com',
      pass: (process.env.EMAIL_APP_PASS || 'hmxd pzkj cttu pjcj').replace(/\s/g, '')
    }
  });

  await transporter.sendMail({
    from: `"EdSync" <${process.env.EMAIL_USER || 'sarimkhan13579@gmail.com'}>`,
    to: email,
    subject,
    html
  });
};

export const sendVerificationEmail = async (email, code) => {
  await sendEmailMessage(
    email,
    'Verify your email address',
    `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
  );
};

export const sendPasswordResetEmail = async (email, code) => {
  await sendEmailMessage(
    email,
    'Reset your password',
    `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
  );
};
