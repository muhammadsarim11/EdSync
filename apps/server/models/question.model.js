import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const questionSchema = new mongoose.Schema(
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
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open'
    },
    replies: [replySchema]
  },
  { timestamps: true }
);

questionSchema.index({ cohortId: 1, createdAt: -1 });

export default mongoose.model('Question', questionSchema);
