import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      required: true
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Dropped'],
      default: 'Active'
    }
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1, cohortId: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
