import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['InstituteAdmin', 'Instructor', 'Student'],
      required: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Revoked'],
      default: 'Pending'
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

export default mongoose.model('Invitation', invitationSchema);
