import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
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

export default mongoose.model('Module', moduleSchema);
