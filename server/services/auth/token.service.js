import jwt from 'jsonwebtoken';

export const createSendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};
