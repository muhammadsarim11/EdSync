import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    orderIndex: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

moduleSchema.index({ cohortId: 1 });
moduleSchema.index({ organizationId: 1 });

export default mongoose.model('Module', moduleSchema);
