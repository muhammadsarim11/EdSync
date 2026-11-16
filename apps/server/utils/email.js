import nodemailer from 'nodemailer';

let cachedTransporter;

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASS.replace(/\s/g, '')
      }
    });
  }
  return cachedTransporter;
};

const sendEmailMessage = async (email, subject, html) => {
  await getTransporter().sendMail({
    from: `"EdSync" <${process.env.EMAIL_USER}>`,
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

export const sendInvitationEmail = async (email, inviteLink, organizationName, role) => {
  await sendEmailMessage(
    email,
    `You're invited to join ${organizationName} on EdSync`,
    `<p>You have been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p><p>Click the link below to accept the invitation and set up your account. It expires in 7 days.</p><p><a href="${inviteLink}">${inviteLink}</a></p>`
  );
};

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export const sendRecordingReadyEmail = async (email, lectureTitle, cohortTitle, link) => {
  await sendEmailMessage(
    email,
    `Recording available: ${lectureTitle}`,
    `<p>The recording for <strong>${escapeHtml(lectureTitle)}</strong> in <strong>${escapeHtml(cohortTitle)}</strong> is now available.</p><p><a href="${encodeURI(link)}">Watch it on EdSync</a></p>`
  );
};
