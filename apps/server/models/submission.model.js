import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    obtainedMarks: {
      type: Number,
      default: null
    },
    feedback: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Submitted', 'Graded', 'Late'],
      default: 'Submitted'
    }
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ organizationId: 1 });

export default mongoose.model('Submission', submissionSchema);
