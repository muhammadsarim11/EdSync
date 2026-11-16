import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

messageSchema.index({ cohortId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
